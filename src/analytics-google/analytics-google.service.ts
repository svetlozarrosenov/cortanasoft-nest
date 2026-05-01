import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { PrismaService } from '../prisma/prisma.service';
import { SaveGoogleAnalyticsConfigDto } from './dto';
import { decryptSecret, encryptSecret } from './crypto.util';

interface ServiceAccountJson {
  client_email?: string;
  private_key?: string;
  project_id?: string;
  type?: string;
}

@Injectable()
export class AnalyticsGoogleService {
  private readonly logger = new Logger(AnalyticsGoogleService.name);

  constructor(private prisma: PrismaService) {}

  async getConfig() {
    const config = await this.prisma.googleAnalyticsConfig.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    if (!config) return null;
    return {
      id: config.id,
      measurementId: config.measurementId,
      propertyId: config.propertyId,
      serviceAccountEmail: config.serviceAccountEmail,
      hasServiceAccount: !!config.serviceAccountJsonEncrypted,
      isActive: config.isActive,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  async getPublicMeasurementId(): Promise<string | null> {
    const config = await this.prisma.googleAnalyticsConfig.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    if (!config || !config.isActive) return null;
    return config.measurementId || null;
  }

  async saveConfig(dto: SaveGoogleAnalyticsConfigDto) {
    const measurementId = dto.measurementId?.trim() || null;
    const propertyId = dto.propertyId?.trim() || null;
    const serviceAccountJson = dto.serviceAccountJson?.trim() || null;

    const existing = await this.prisma.googleAnalyticsConfig.findFirst();

    if (!measurementId && !propertyId && !serviceAccountJson && !existing) {
      throw new BadRequestException(
        'Въведете поне Measurement ID или Data API конфигурация',
      );
    }

    let serviceAccountEmail = existing?.serviceAccountEmail ?? null;
    let encryptedJson = existing?.serviceAccountJsonEncrypted ?? null;
    let savedPropertyId = existing?.propertyId ?? null;

    if (serviceAccountJson) {
      let parsed: ServiceAccountJson;
      try {
        parsed = JSON.parse(serviceAccountJson);
      } catch {
        throw new BadRequestException('Невалиден JSON за service account');
      }
      if (
        !parsed.client_email ||
        !parsed.private_key ||
        parsed.type !== 'service_account'
      ) {
        throw new BadRequestException(
          'JSON-ът не изглежда като валиден Google service account ключ',
        );
      }

      const propertyToTest = propertyId || existing?.propertyId;
      if (!propertyToTest) {
        throw new BadRequestException(
          'За Service Account JSON трябва и Property ID',
        );
      }

      await this.testCredentials(propertyToTest, serviceAccountJson);

      encryptedJson = encryptSecret(serviceAccountJson);
      serviceAccountEmail = parsed.client_email;
      savedPropertyId = propertyToTest;
    } else if (propertyId) {
      savedPropertyId = propertyId;
    }

    const data = {
      measurementId,
      propertyId: savedPropertyId,
      serviceAccountJsonEncrypted: encryptedJson,
      serviceAccountEmail,
      isActive: true,
    };

    const saved = existing
      ? await this.prisma.googleAnalyticsConfig.update({
          where: { id: existing.id },
          data,
        })
      : await this.prisma.googleAnalyticsConfig.create({ data });

    return {
      id: saved.id,
      measurementId: saved.measurementId,
      propertyId: saved.propertyId,
      serviceAccountEmail: saved.serviceAccountEmail,
      hasServiceAccount: !!saved.serviceAccountJsonEncrypted,
      isActive: saved.isActive,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  async deleteConfig() {
    const existing = await this.prisma.googleAnalyticsConfig.findFirst();
    if (!existing) return { success: true };
    await this.prisma.googleAnalyticsConfig.delete({ where: { id: existing.id } });
    return { success: true };
  }

  async getOverview(days: number) {
    const client = await this.getClient();
    const property = `properties/${client.propertyId}`;
    const startDate = `${Math.max(1, Math.min(365, days))}daysAgo`;

    const [summary] = await client.client.runReport({
      property,
      dateRanges: [{ startDate, endDate: 'today' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
        { name: 'newUsers' },
      ],
    });

    const [byDate] = await client.client.runReport({
      property,
      dateRanges: [{ startDate, endDate: 'today' }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    });

    const [topPages] = await client.client.runReport({
      property,
      dateRanges: [{ startDate, endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
      metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 10,
    });

    const [sources] = await client.client.runReport({
      property,
      dateRanges: [{ startDate, endDate: 'today' }],
      dimensions: [{ name: 'sessionSource' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 10,
    });

    const [countries] = await client.client.runReport({
      property,
      dateRanges: [{ startDate, endDate: 'today' }],
      dimensions: [{ name: 'country' }],
      metrics: [{ name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 10,
    });

    const [devices] = await client.client.runReport({
      property,
      dateRanges: [{ startDate, endDate: 'today' }],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [{ name: 'sessions' }],
    });

    return {
      summary: this.singleRowMetrics(summary, [
        'activeUsers',
        'sessions',
        'screenPageViews',
        'averageSessionDuration',
        'bounceRate',
        'newUsers',
      ]),
      byDate: (byDate.rows || []).map((row) => ({
        date: row.dimensionValues?.[0]?.value || '',
        activeUsers: Number(row.metricValues?.[0]?.value || 0),
        sessions: Number(row.metricValues?.[1]?.value || 0),
        pageViews: Number(row.metricValues?.[2]?.value || 0),
      })),
      topPages: (topPages.rows || []).map((row) => ({
        path: row.dimensionValues?.[0]?.value || '',
        title: row.dimensionValues?.[1]?.value || '',
        pageViews: Number(row.metricValues?.[0]?.value || 0),
        activeUsers: Number(row.metricValues?.[1]?.value || 0),
      })),
      sources: (sources.rows || []).map((row) => ({
        source: row.dimensionValues?.[0]?.value || '',
        sessions: Number(row.metricValues?.[0]?.value || 0),
      })),
      countries: (countries.rows || []).map((row) => ({
        country: row.dimensionValues?.[0]?.value || '',
        activeUsers: Number(row.metricValues?.[0]?.value || 0),
      })),
      devices: (devices.rows || []).map((row) => ({
        device: row.dimensionValues?.[0]?.value || '',
        sessions: Number(row.metricValues?.[0]?.value || 0),
      })),
    };
  }

  async getRealtime() {
    const client = await this.getClient();
    const property = `properties/${client.propertyId}`;

    const [report] = await client.client.runRealtimeReport({
      property,
      metrics: [{ name: 'activeUsers' }],
      dimensions: [{ name: 'country' }],
      limit: 10,
    });

    const [byDevice] = await client.client.runRealtimeReport({
      property,
      metrics: [{ name: 'activeUsers' }],
      dimensions: [{ name: 'deviceCategory' }],
    });

    const total = (report.rows || []).reduce(
      (sum, r) => sum + Number(r.metricValues?.[0]?.value || 0),
      0,
    );

    return {
      activeUsers: total,
      byCountry: (report.rows || []).map((row) => ({
        country: row.dimensionValues?.[0]?.value || '',
        activeUsers: Number(row.metricValues?.[0]?.value || 0),
      })),
      byDevice: (byDevice.rows || []).map((row) => ({
        device: row.dimensionValues?.[0]?.value || '',
        activeUsers: Number(row.metricValues?.[0]?.value || 0),
      })),
    };
  }

  private async getClient(): Promise<{
    client: BetaAnalyticsDataClient;
    propertyId: string;
  }> {
    const config = await this.prisma.googleAnalyticsConfig.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    if (
      !config ||
      !config.isActive ||
      !config.propertyId ||
      !config.serviceAccountJsonEncrypted
    ) {
      throw new NotFoundException(
        'Google Analytics Data API не е конфигуриран. Моля задайте Property ID и Service Account JSON.',
      );
    }
    const json = decryptSecret(config.serviceAccountJsonEncrypted);
    return {
      client: this.buildClient(json),
      propertyId: config.propertyId,
    };
  }

  private buildClient(serviceAccountJson: string): BetaAnalyticsDataClient {
    const credentials = JSON.parse(serviceAccountJson);
    return new BetaAnalyticsDataClient({ credentials });
  }

  private async testCredentials(propertyId: string, serviceAccountJson: string) {
    try {
      const client = this.buildClient(serviceAccountJson);
      await client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        metrics: [{ name: 'activeUsers' }],
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`GA test failed: ${message}`);
      throw new BadRequestException(
        `Тестът на връзката с Google Analytics се провали: ${message}`,
      );
    }
  }

  private singleRowMetrics(
    report: { rows?: { metricValues?: { value?: string | null }[] | null }[] | null },
    metricNames: string[],
  ) {
    const row = report.rows?.[0];
    const values = row?.metricValues || [];
    const out: Record<string, number> = {};
    metricNames.forEach((name, i) => {
      out[name] = Number(values[i]?.value || 0);
    });
    return out;
  }
}
