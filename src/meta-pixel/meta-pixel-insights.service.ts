import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { MetaPixelService } from './meta-pixel.service';

// Meta Graph API — статистики за пиксела и резултати от рекламите.
//
// GET /{pixel_id}/stats (docs: marketing-api/reference/ads-pixel/stats) връща ЧАСОВИ кофи:
//   { data: [{ aggregation, start_time, data: [{ value, count }] }], paging: { next } }
// където `value` е стойността на измерението (име на event, browser type, ОС...),
// а `count` — колко пъти е fire-нат пикселът с нея в този час. Сумираме по `value`
// и строим дневна серия по start_time.
//
// GET /act_{id}/insights?level=campaign дава разход/показвания/кликове/приписани лийдове
// по кампания; GET /me/adaccounts открива рекламните акаунти, дадени на системния потребител.
//
// Ограничения на Meta: pixel stats само за последните 7 дни; токенът трябва да има
// ads_read / ads_management върху бизнеса, който притежава пиксела и рекламния акаунт.

const GRAPH_API_VERSION = 'v24.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;
const PAGE_LIMIT = 500;
const MAX_PAGES = 20;
// Дневната серия е по местно време на фирмата (СВ Софт, България).
const REPORT_TIME_ZONE = 'Europe/Sofia';

export const MAX_INSIGHTS_DAYS = 7;
export const ADS_DAYS_OPTIONS = [7, 30, 90] as const;

type Aggregation = 'event' | 'event_source' | 'browser_type' | 'device_os';

interface GraphError {
  message: string;
  code?: number;
  error_subcode?: number;
  type?: string;
  fbtrace_id?: string;
}

interface GraphPage<T> {
  data?: T[];
  paging?: { next?: string };
  error?: GraphError;
}

interface GraphStatsNode {
  aggregation?: string;
  start_time?: string;
  data?: Array<{
    value?: string | number | null;
    count?: number | string | null;
  }>;
}

interface GraphAdAccount {
  id?: string;
  account_id?: string;
  name?: string;
  currency?: string;
}

interface GraphCampaign {
  id?: string;
  name?: string;
  effective_status?: string;
}

interface GraphCampaignInsight {
  campaign_id?: string;
  campaign_name?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  actions?: Array<{ action_type?: string; value?: string }>;
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

interface Bucket {
  value: string;
  count: number;
}

export interface PixelDailyPoint {
  // YYYY-MM-DD в REPORT_TIME_ZONE
  date: string;
  counts: Record<string, number>;
}

export interface PixelOverview {
  totalEvents: number;
  byEvent: Array<{ name: string; count: number }>;
  bySource: Array<{ source: string; count: number }>;
  byBrowser: Array<{ browser: string; count: number }>;
  byDeviceOs: Array<{ deviceOs: string; count: number }>;
  // Дневна серия за всеки event (последните N дни, без дупки — дни без събития са с 0).
  daily: PixelDailyPoint[];
  // Разбивки, които Meta отказа (съобщението на Graph API). Основната по event
  // при грешка хвърля, така че тук са само второстепенните.
  warnings: string[];
  rangeStart: string;
  rangeEnd: string;
  lastUpdated: string;
}

export interface AdsCampaignRow {
  id: string;
  name: string;
  status: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  leads: number;
  costPerLead: number | null;
}

export interface AdsTotals {
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  costPerLead: number | null;
}

export interface AdsAccountInsights {
  accountId: string;
  name: string;
  currency: string;
  totals: AdsTotals;
  // Винаги последните 7 дни — за сравнение с pixel статистиките, които са само за 7 дни.
  last7: AdsTotals;
  campaigns: AdsCampaignRow[];
}

export interface AdsOverview {
  days: number;
  accounts: AdsAccountInsights[];
  warnings: string[];
  lastUpdated: string;
}

export class MetaGraphApiError extends Error {
  constructor(
    message: string,
    readonly code?: number,
    readonly httpStatus?: number,
  ) {
    super(message);
    this.name = 'MetaGraphApiError';
  }
}

// Meta: "lead" е общият брой лийдове (пиксел + форми + съобщения). Ако го няма,
// сумираме отделните видове.
const LEAD_ACTION_TOTAL = 'lead';
const LEAD_ACTION_PARTS = [
  'offsite_conversion.fb_pixel_lead',
  'onsite_conversion.lead_grouped',
  'leadgen_grouped',
  'onsite_web_lead',
];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function leadsFromActions(actions: GraphCampaignInsight['actions']): number {
  if (!actions?.length) return 0;
  const total = actions.find((a) => a.action_type === LEAD_ACTION_TOTAL);
  if (total) return Number(total.value ?? 0) || 0;
  return actions
    .filter((a) => a.action_type && LEAD_ACTION_PARTS.includes(a.action_type))
    .reduce((sum, a) => sum + (Number(a.value ?? 0) || 0), 0);
}

function sumTotals(rows: AdsCampaignRow[]): AdsTotals {
  const spend = round2(rows.reduce((s, r) => s + r.spend, 0));
  const impressions = rows.reduce((s, r) => s + r.impressions, 0);
  const clicks = rows.reduce((s, r) => s + r.clicks, 0);
  const leads = rows.reduce((s, r) => s + r.leads, 0);
  return {
    spend,
    impressions,
    clicks,
    leads,
    costPerLead: leads > 0 ? round2(spend / leads) : null,
  };
}

@Injectable()
export class MetaPixelInsightsService {
  private readonly logger = new Logger(MetaPixelInsightsService.name);
  private readonly CACHE_TTL_MS = 10 * 60 * 1000; // 10 min
  private cache = new Map<string, CacheEntry<unknown>>();

  constructor(private metaPixelService: MetaPixelService) {}

  async getOverview(days: number): Promise<PixelOverview> {
    const safeDays = Math.max(
      1,
      Math.min(MAX_INSIGHTS_DAYS, Math.floor(days) || 1),
    );
    const cacheKey = `overview-${safeDays}`;
    const cached = this.cache.get(cacheKey) as
      | CacheEntry<PixelOverview>
      | undefined;
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const config = await this.requireConfig();

    const endTimeMs = Date.now();
    const startTimeMs = endTimeMs - safeDays * 24 * 60 * 60 * 1000;
    const startTime = Math.floor(startTimeMs / 1000);
    const endTime = Math.floor(endTimeMs / 1000);

    const fetchNodes = (aggregation: Aggregation) =>
      this.fetchStatsNodes(
        config.pixelId,
        config.accessToken,
        aggregation,
        startTime,
        endTime,
      );

    // Основната разбивка: ако Meta я откаже (права, невалиден токен, изтекъл токен),
    // няма смисъл от останалите — връщаме грешката на админа, за да я види.
    let eventNodes: GraphStatsNode[];
    try {
      eventNodes = await fetchNodes('event');
    } catch (err) {
      const message = this.describeError(err);
      this.logger.error(`Pixel stats aggregation=event failed: ${message}`);
      throw new BadRequestException(message);
    }

    const warnings: string[] = [];
    const optional = async (aggregation: Aggregation): Promise<Bucket[]> => {
      try {
        return totalsByValue(await fetchNodes(aggregation));
      } catch (err) {
        const message = this.describeError(err);
        this.logger.warn(
          `Pixel stats aggregation=${aggregation} failed: ${message}`,
        );
        warnings.push(`${aggregation}: ${message}`);
        return [];
      }
    };

    const [bySource, byBrowser, byDeviceOs] = await Promise.all([
      optional('event_source'),
      optional('browser_type'),
      optional('device_os'),
    ]);

    const byEvent = totalsByValue(eventNodes);
    const totalEvents = byEvent.reduce((sum, x) => sum + x.count, 0);

    const result: PixelOverview = {
      totalEvents,
      byEvent: byEvent.map((x) => ({ name: x.value, count: x.count })),
      bySource: bySource.map((x) => ({ source: x.value, count: x.count })),
      byBrowser: byBrowser.map((x) => ({ browser: x.value, count: x.count })),
      byDeviceOs: byDeviceOs.map((x) => ({
        deviceOs: x.value,
        count: x.count,
      })),
      daily: dailySeries(eventNodes, startTimeMs, endTimeMs),
      warnings,
      rangeStart: new Date(startTimeMs).toISOString(),
      rangeEnd: new Date(endTimeMs).toISOString(),
      lastUpdated: new Date().toISOString(),
    };

    this.cache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });
    return result;
  }

  /**
   * Резултати от рекламите по кампания за всички рекламни акаунти, до които токенът
   * има достъп. `days` е 7 / 30 / 90 (date_preset на Meta, по часовата зона на акаунта).
   */
  async getAdsOverview(days: number): Promise<AdsOverview> {
    const safeDays = (ADS_DAYS_OPTIONS as readonly number[]).includes(days)
      ? days
      : 7;
    const cacheKey = `ads-${safeDays}`;
    const cached = this.cache.get(cacheKey) as
      | CacheEntry<AdsOverview>
      | undefined;
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const config = await this.requireConfig();
    const token = config.accessToken;

    let accounts: GraphAdAccount[];
    try {
      accounts = await this.fetchAllPages<GraphAdAccount>(
        `${GRAPH_BASE}/me/adaccounts?${new URLSearchParams({
          fields: 'id,account_id,name,currency',
          limit: '50',
          access_token: token,
        })}`,
      );
    } catch (err) {
      const message = this.describeError(err);
      this.logger.error(`Ad accounts lookup failed: ${message}`);
      throw new BadRequestException(message);
    }

    const warnings: string[] = [];
    const result: AdsOverview = {
      days: safeDays,
      accounts: [],
      warnings,
      lastUpdated: new Date().toISOString(),
    };

    for (const account of accounts) {
      const actId =
        account.id ?? (account.account_id ? `act_${account.account_id}` : null);
      if (!actId) continue;
      const accountId = account.account_id ?? actId.replace(/^act_/, '');
      const name = account.name ?? accountId;
      try {
        const [statuses, rows, last7Rows] = await Promise.all([
          this.fetchCampaignStatuses(actId, token),
          this.fetchCampaignInsights(actId, token, safeDays),
          safeDays === 7
            ? Promise.resolve<AdsCampaignRow[] | null>(null)
            : this.fetchCampaignInsights(actId, token, 7),
        ]);
        const campaigns = rows
          .map((r) => ({ ...r, status: statuses.get(r.id) ?? null }))
          .sort((a, b) => b.spend - a.spend);
        result.accounts.push({
          accountId,
          name,
          currency: account.currency ?? 'USD',
          totals: sumTotals(campaigns),
          last7: sumTotals(last7Rows ?? rows),
          campaigns,
        });
      } catch (err) {
        const message = this.describeError(err);
        this.logger.warn(`Ad account ${accountId} insights failed: ${message}`);
        warnings.push(`${name}: ${message}`);
      }
    }

    this.cache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });
    return result;
  }

  // За debug/admin "force refresh" — изтрива всички кеширани entries.
  clearCache(): void {
    this.cache.clear();
  }

  private async requireConfig() {
    const config = await this.metaPixelService.getEventConfig();
    if (!config) {
      throw new BadRequestException(
        'Meta Pixel CAPI не е конфигуриран — добавете Pixel ID + Access Token в админа',
      );
    }
    return config;
  }

  private async fetchCampaignStatuses(
    actId: string,
    token: string,
  ): Promise<Map<string, string>> {
    const campaigns = await this.fetchAllPages<GraphCampaign>(
      `${GRAPH_BASE}/${actId}/campaigns?${new URLSearchParams({
        fields: 'id,name,effective_status',
        limit: '200',
        access_token: token,
      })}`,
    );
    const map = new Map<string, string>();
    for (const c of campaigns) {
      if (c.id && c.effective_status) map.set(c.id, c.effective_status);
    }
    return map;
  }

  private async fetchCampaignInsights(
    actId: string,
    token: string,
    days: number,
  ): Promise<AdsCampaignRow[]> {
    const rows = await this.fetchAllPages<GraphCampaignInsight>(
      `${GRAPH_BASE}/${actId}/insights?${new URLSearchParams({
        level: 'campaign',
        fields: 'campaign_id,campaign_name,spend,impressions,clicks,actions',
        date_preset: `last_${days}d`,
        limit: '100',
        access_token: token,
      })}`,
    );
    return rows
      .filter((r) => r.campaign_id)
      .map((r) => {
        const spend = round2(Number(r.spend ?? 0) || 0);
        const impressions = Number(r.impressions ?? 0) || 0;
        const clicks = Number(r.clicks ?? 0) || 0;
        const leads = leadsFromActions(r.actions);
        return {
          id: String(r.campaign_id),
          name: r.campaign_name ?? String(r.campaign_id),
          status: null,
          spend,
          impressions,
          clicks,
          ctr: impressions > 0 ? round2((clicks / impressions) * 100) : 0,
          leads,
          costPerLead: leads > 0 ? round2(spend / leads) : null,
        };
      });
  }

  private async fetchStatsNodes(
    pixelId: string,
    accessToken: string,
    aggregation: Aggregation,
    startTime: number,
    endTime: number,
  ): Promise<GraphStatsNode[]> {
    const params = new URLSearchParams({
      aggregation,
      start_time: String(startTime),
      end_time: String(endTime),
      limit: String(PAGE_LIMIT),
      access_token: accessToken,
    });
    return this.fetchAllPages<GraphStatsNode>(
      `${GRAPH_BASE}/${encodeURIComponent(pixelId)}/stats?${params}`,
    );
  }

  /**
   * Тегли всички страници на един Graph edge. Хвърля MetaGraphApiError с оригиналното
   * съобщение на Meta при отказ. URL-ът съдържа токена — никога не го логваме.
   */
  private async fetchAllPages<T>(firstUrl: string): Promise<T[]> {
    const items: T[] = [];
    let url: string | null = firstUrl;
    for (let page = 0; url && page < MAX_PAGES; page++) {
      const res = await fetch(url);
      let json: GraphPage<T>;
      try {
        json = (await res.json()) as GraphPage<T>;
      } catch {
        throw new MetaGraphApiError(
          `Невалиден отговор от Meta (HTTP ${res.status})`,
          undefined,
          res.status,
        );
      }
      if (json.error || !res.ok) {
        const e = json.error;
        const code = e?.code;
        const text = e?.message ?? `HTTP ${res.status}`;
        // Meta често вече започва съобщението с "(#100) ..." — не го дублираме.
        const prefixed =
          code !== undefined && !text.startsWith(`(#${code})`)
            ? `(#${code}) ${text}`
            : text;
        throw new MetaGraphApiError(prefixed, code, res.status);
      }
      items.push(...(json.data ?? []));
      url = json.paging?.next ?? null;
    }
    return items;
  }

  private describeError(err: unknown): string {
    if (err instanceof Error) return `Meta Graph API: ${err.message}`;
    return `Meta Graph API: ${String(err)}`;
  }
}

function totalsByValue(nodes: GraphStatsNode[]): Bucket[] {
  const totals = new Map<string, number>();
  for (const node of nodes) {
    for (const row of node.data ?? []) {
      const key =
        row.value === null || row.value === undefined || row.value === ''
          ? 'unknown'
          : String(row.value);
      const count = Number(row.count ?? 0);
      if (!Number.isFinite(count)) continue;
      totals.set(key, (totals.get(key) ?? 0) + count);
    }
  }
  return [...totals.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: REPORT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function localDate(ms: number): string {
  // en-CA дава YYYY-MM-DD
  return dateFormatter.format(new Date(ms));
}

function dailySeries(
  nodes: GraphStatsNode[],
  startTimeMs: number,
  endTimeMs: number,
): PixelDailyPoint[] {
  const byDate = new Map<string, Record<string, number>>();
  // Всички дни в периода присъстват, дори без събития.
  for (let ms = startTimeMs; ms <= endTimeMs; ms += 24 * 60 * 60 * 1000) {
    byDate.set(localDate(ms), {});
  }
  byDate.set(localDate(endTimeMs), byDate.get(localDate(endTimeMs)) ?? {});

  for (const node of nodes) {
    if (!node.start_time) continue;
    const ms = Date.parse(node.start_time);
    if (!Number.isFinite(ms)) continue;
    const date = localDate(ms);
    const counts = byDate.get(date) ?? {};
    for (const row of node.data ?? []) {
      const key =
        row.value === null || row.value === undefined || row.value === ''
          ? 'unknown'
          : String(row.value);
      const count = Number(row.count ?? 0);
      if (!Number.isFinite(count)) continue;
      counts[key] = (counts[key] ?? 0) + count;
    }
    byDate.set(date, counts);
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, counts]) => ({ date, counts }));
}
