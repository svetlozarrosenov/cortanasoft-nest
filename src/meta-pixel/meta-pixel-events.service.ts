import { Injectable, Logger } from '@nestjs/common';
import { MetaPixelService } from './meta-pixel.service';
import { PrismaService } from '../prisma/prisma.service';

// SDK-то няма официални TS типове, затова го import-ваме като any и го wrap-ваме тук.
// Auto-hash-ва email/phone/имена със SHA-256 lowercase trim преди send.
// Docs: https://developers.facebook.com/docs/marketing-api/conversions-api
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const bizSdk = require('facebook-nodejs-business-sdk');
const { ServerEvent, EventRequest, UserData, CustomData, FacebookAdsApi } = bizSdk;

export type CapiEventName = 'PageView' | 'Lead' | 'Contact' | 'ViewContent' | 'CompleteRegistration';

export interface SendCapiEventInput {
  eventName: CapiEventName;
  // UUID, споделен с browser Pixel-а през fbq()'s { eventID } за дедупликация.
  eventId: string;
  // Опц. URL на страницата, от която event-ът е иницииран.
  eventSourceUrl?: string;
  // Request enrichment (server-side). Без тях match quality пада драстично.
  ip?: string;
  userAgent?: string;
  fbp?: string;
  fbc?: string;
  // PII (auto-hashed от SDK). Празни → не се пращат.
  email?: string;
  phone?: string;
  // Custom data за filter-и в Custom Audiences. Currently само content_name.
  contentName?: string;
  // Само за нашия лог (не отива в Meta)
  path?: string;
  referrer?: string;
  firstName?: string;
  lastName?: string;
}

@Injectable()
export class MetaPixelEventsService {
  private readonly logger = new Logger(MetaPixelEventsService.name);

  constructor(
    private metaPixelService: MetaPixelService,
    private prisma: PrismaService,
  ) {}

  /**
   * Fire-and-forget. Логва грешки, не блокира caller-а.
   * Връща промис главно за тестване / explicit await където е нужно.
   */
  async sendEvent(input: SendCapiEventInput): Promise<void> {
    // Логът е нужен и без CAPI (само Pixel) — записваме преди изпращането
    const row = await this.persist(input);

    let config;
    try {
      config = await this.metaPixelService.getEventConfig();
    } catch (err) {
      this.logger.error('Failed to load Meta Pixel CAPI config', err);
      await this.finish(row?.id, { capiError: 'config load failed' });
      return;
    }
    if (!config) {
      // CAPI не е конфигуриран (липсва accessToken или Pixel е inactive). Тихо skip.
      await this.finish(row?.id, { capiError: 'CAPI not configured' });
      return;
    }

    try {
      FacebookAdsApi.init(config.accessToken);

      const userData = new UserData()
        .setClientIpAddress(input.ip || undefined)
        .setClientUserAgent(input.userAgent || undefined);
      if (input.email) userData.setEmails([input.email]);
      if (input.phone) userData.setPhones([this.normalizePhone(input.phone)]);
      if (input.fbp) userData.setFbp(input.fbp);
      if (input.fbc) userData.setFbc(input.fbc);

      const customData = new CustomData();
      if (input.contentName) customData.setContentName(input.contentName);

      const serverEvent = new ServerEvent()
        .setEventName(input.eventName)
        .setEventTime(Math.floor(Date.now() / 1000))
        .setEventId(input.eventId)
        .setActionSource('website')
        .setUserData(userData)
        .setCustomData(customData);
      if (input.eventSourceUrl) serverEvent.setEventSourceUrl(input.eventSourceUrl);

      const eventRequest = new EventRequest(config.accessToken, config.pixelId).setEvents([
        serverEvent,
      ]);
      if (config.testEventCode) {
        eventRequest.setTestEventCode(config.testEventCode);
      }

      const response = await eventRequest.execute();
      this.logger.log(
        `CAPI ${input.eventName} sent (event_id=${input.eventId}, fbtrace=${response?.fbtrace_id ?? 'n/a'})`,
      );
      await this.finish(row?.id, {
        capiSuccess: true,
        capiStatus: 200,
        capiResponse: JSON.stringify(response ?? {}).slice(0, 2000),
      });
    } catch (err) {
      this.logger.error(
        `Meta CAPI send failed for event=${input.eventName} id=${input.eventId}`,
        err instanceof Error ? err.stack : String(err),
      );
      const e = err as { status?: number; response?: unknown; message?: string };
      await this.finish(row?.id, {
        capiStatus: typeof e?.status === 'number' ? e.status : null,
        capiResponse: e?.response ? JSON.stringify(e.response).slice(0, 2000) : null,
        capiError: (e?.message ?? String(err)).slice(0, 2000),
      });
    }
  }

  private async persist(input: SendCapiEventInput) {
    try {
      return await this.prisma.metaPixelEvent.create({
        data: {
          eventName: input.eventName,
          eventId: input.eventId,
          eventSourceUrl: input.eventSourceUrl?.slice(0, 2000) ?? null,
          path: input.path?.slice(0, 500) ?? this.pathOf(input.eventSourceUrl),
          referrer: input.referrer?.slice(0, 2000) ?? null,
          contentName: input.contentName ?? null,
          userEmail: input.email?.trim().toLowerCase() || null,
          userPhone: input.phone || null,
          userFirstName: input.firstName || null,
          userLastName: input.lastName || null,
          userIp: input.ip || null,
          userAgent: input.userAgent?.slice(0, 500) || null,
          fbp: input.fbp || null,
          fbc: input.fbc || null,
        },
        select: { id: true },
      });
    } catch (err) {
      this.logger.error('Failed to persist Meta Pixel event', err as Error);
      return null;
    }
  }

  private async finish(
    id: string | undefined,
    data: { capiSuccess?: boolean; capiStatus?: number | null; capiResponse?: string | null; capiError?: string | null },
  ) {
    if (!id) return;
    await this.prisma.metaPixelEvent
      .update({ where: { id }, data })
      .catch((err: unknown) => this.logger.error('Failed to update Meta Pixel event', err as Error));
  }

  private pathOf(url?: string): string | null {
    if (!url) return null;
    try {
      return new URL(url).pathname.slice(0, 500);
    } catch {
      return null;
    }
  }

  // E.164-ish normalization: strip всичко освен цифри. SDK хешира това.
  private normalizePhone(phone: string): string {
    return phone.replace(/\D+/g, '');
  }
}
