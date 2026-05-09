import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { MetaPixelService } from './meta-pixel.service';

// SDK без официални TS типове — wrap-ваме като any.
// Docs: https://developers.facebook.com/docs/marketing-api/reference/ads-pixel/stats/
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const bizSdk = require('facebook-nodejs-business-sdk');
const { AdsPixel, FacebookAdsApi } = bizSdk;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

interface StatBucket {
  event: string;
  count: number;
  value: number;
}

export interface PixelOverview {
  totalEvents: number;
  byEvent: Array<{ name: string; count: number }>;
  bySource: Array<{ source: string; count: number }>;
  byBrowser: Array<{ browser: string; count: number }>;
  byDeviceOs: Array<{ deviceOs: string; count: number }>;
  rangeStart: string;
  rangeEnd: string;
  lastUpdated: string;
}

@Injectable()
export class MetaPixelInsightsService {
  private readonly logger = new Logger(MetaPixelInsightsService.name);
  private readonly CACHE_TTL_MS = 10 * 60 * 1000; // 10 min
  private cache = new Map<string, CacheEntry<unknown>>();

  constructor(private metaPixelService: MetaPixelService) {}

  async getOverview(days: number): Promise<PixelOverview> {
    const cacheKey = `overview-${days}`;
    const cached = this.cache.get(cacheKey) as CacheEntry<PixelOverview> | undefined;
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const config = await this.metaPixelService.getEventConfig();
    if (!config) {
      throw new BadRequestException(
        'Meta Pixel CAPI не е конфигуриран — добавете Pixel ID + Access Token в админа',
      );
    }

    FacebookAdsApi.init(config.accessToken);
    const pixel = new AdsPixel(config.pixelId);

    const endTimeMs = Date.now();
    const startTimeMs = endTimeMs - days * 24 * 60 * 60 * 1000;
    const startTime = Math.floor(startTimeMs / 1000);
    const endTime = Math.floor(endTimeMs / 1000);

    const fields = ['count', 'event', 'value'];

    const fetchAggregation = async (aggregation: string): Promise<StatBucket[]> => {
      try {
        const cursor = await pixel.getStats(fields, {
          aggregation,
          start_time: startTime,
          end_time: endTime,
        });
        // Cursor-ът на SDK-то е iterable с items — конвертираме към prosto array.
        const arr: unknown = Array.isArray(cursor) ? cursor : Array.from(cursor || []);
        const items = arr as Array<{ _data?: StatBucket } & StatBucket>;
        return items.map((it) => {
          const d = it._data ?? it;
          return {
            event: String(d.event ?? ''),
            count: Number(d.count ?? 0),
            value: Number(d.value ?? 0),
          };
        });
      } catch (err) {
        this.logger.error(
          `Pixel stats aggregation=${aggregation} failed`,
          err instanceof Error ? err.stack : String(err),
        );
        return [];
      }
    };

    const [byEvent, bySource, byBrowser, byDeviceOs] = await Promise.all([
      fetchAggregation('event'),
      fetchAggregation('event_source'),
      fetchAggregation('browser'),
      fetchAggregation('device_os'),
    ]);

    const totalEvents = byEvent.reduce((sum, x) => sum + x.count, 0);

    const result: PixelOverview = {
      totalEvents,
      byEvent: byEvent.map((x) => ({ name: x.event || 'unknown', count: x.count })),
      bySource: bySource.map((x) => ({ source: x.event || 'unknown', count: x.count })),
      byBrowser: byBrowser.map((x) => ({ browser: x.event || 'unknown', count: x.count })),
      byDeviceOs: byDeviceOs.map((x) => ({ deviceOs: x.event || 'unknown', count: x.count })),
      rangeStart: new Date(startTimeMs).toISOString(),
      rangeEnd: new Date(endTimeMs).toISOString(),
      lastUpdated: new Date().toISOString(),
    };

    this.cache.set(cacheKey, { data: result, expiresAt: Date.now() + this.CACHE_TTL_MS });
    return result;
  }

  // За debug/admin "force refresh" — изтрива всички кеширани entries.
  clearCache(): void {
    this.cache.clear();
  }
}
