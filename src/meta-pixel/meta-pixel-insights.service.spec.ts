import { BadRequestException } from '@nestjs/common';
import { MetaPixelInsightsService } from './meta-pixel-insights.service';
import { MetaPixelService } from './meta-pixel.service';

interface FakeResponse {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}

type FetchMock = jest.Mock<Promise<FakeResponse>, [string]>;

function jsonResponse(body: unknown, status = 200): Promise<FakeResponse> {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  });
}

function aggregationOf(url: string): string {
  return new URL(url).searchParams.get('aggregation') ?? '';
}

function bucket(
  aggregation: string,
  rows: Array<{ value: string; count: number | string }>,
) {
  return { aggregation, start_time: '2026-09-28T10:00:00+0000', data: rows };
}

describe('MetaPixelInsightsService', () => {
  let service: MetaPixelInsightsService;
  let fetchMock: FetchMock;
  const originalFetch = global.fetch;

  beforeEach(() => {
    const metaPixelService = {
      getEventConfig: jest.fn().mockResolvedValue({
        pixelId: '991055846907415',
        accessToken: 'secret-token',
        testEventCode: null,
        isActive: true,
      }),
    } as unknown as MetaPixelService;
    service = new MetaPixelInsightsService(metaPixelService);
    fetchMock = jest.fn() as FetchMock;
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('sums hourly buckets per value and follows paging', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (aggregationOf(url) !== 'event') return jsonResponse({ data: [] });
      if (!url.includes('after=')) {
        return jsonResponse({
          data: [
            bucket('event', [
              { value: 'PageView', count: 5 },
              { value: 'Lead', count: 1 },
            ]),
            bucket('event', [{ value: 'PageView', count: '3' }]),
          ],
          paging: { next: `${url}&after=abc` },
        });
      }
      return jsonResponse({
        data: [bucket('event', [{ value: 'Lead', count: 2 }])],
      });
    });

    const overview = await service.getOverview(7);

    expect(overview.totalEvents).toBe(11);
    expect(overview.byEvent).toEqual([
      { name: 'PageView', count: 8 },
      { name: 'Lead', count: 3 },
    ]);
    expect(overview.warnings).toEqual([]);
    // Само валидни Meta агрегации (browser_type, не browser).
    const aggregations = fetchMock.mock.calls.map(([u]) => aggregationOf(u));
    expect(new Set(aggregations)).toEqual(
      new Set(['event', 'event_source', 'browser_type', 'device_os', 'url']),
    );
  });

  it('groups page urls by path, ignoring host, scheme and query', async () => {
    fetchMock.mockImplementation((url: string) => {
      const aggregation = aggregationOf(url);
      if (aggregation === 'url') {
        return jsonResponse({
          data: [
            bucket('url', [
              {
                value: 'https://cortanasoft.com/kontakti?fbclid=abc',
                count: 3,
              },
              { value: 'http://www.cortanasoft.com/kontakti/', count: 2 },
              { value: 'https://cortanasoft.com/', count: 10 },
            ]),
          ],
        });
      }
      return jsonResponse({ data: [] });
    });

    const overview = await service.getOverview(7);

    expect(overview.byUrl).toEqual([
      { url: '/', count: 10 },
      { url: '/kontakti', count: 5 },
    ]);
  });

  it('surfaces the Meta error when the event aggregation is refused', async () => {
    fetchMock.mockImplementation(() =>
      jsonResponse(
        {
          error: {
            message: 'Permissions error',
            code: 200,
            type: 'OAuthException',
          },
        },
        403,
      ),
    );

    await expect(service.getOverview(7)).rejects.toThrow(BadRequestException);
    await expect(service.getOverview(7)).rejects.toThrow(
      '(#200) Permissions error',
    );
  });

  it('does not duplicate the error code Meta already puts in the message', async () => {
    fetchMock.mockImplementation(() =>
      jsonResponse(
        { error: { message: '(#100) Missing Permission', code: 100 } },
        400,
      ),
    );

    await expect(service.getOverview(7)).rejects.toThrow(
      'Meta Graph API: (#100) Missing Permission',
    );
    await expect(service.getOverview(7)).rejects.not.toThrow('(#100) (#100)');
  });

  it('keeps the event totals and reports failed secondary aggregations as warnings', async () => {
    fetchMock.mockImplementation((url: string) => {
      const aggregation = aggregationOf(url);
      if (aggregation === 'device_os') {
        return jsonResponse(
          { error: { message: 'Unsupported', code: 100 } },
          400,
        );
      }
      return jsonResponse({
        data: [bucket(aggregation, [{ value: 'x', count: 1 }])],
      });
    });

    const overview = await service.getOverview(3);

    expect(overview.totalEvents).toBe(1);
    expect(overview.byDeviceOs).toEqual([]);
    expect(overview.warnings).toEqual([
      'device_os: Meta Graph API: (#100) Unsupported',
    ]);
  });

  it('builds a gap-free daily series from the hourly buckets', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (aggregationOf(url) !== 'event') return jsonResponse({ data: [] });
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      return jsonResponse({
        data: [
          {
            aggregation: 'event',
            start_time: dayAgo,
            data: [{ value: 'Lead', count: 2 }],
          },
          {
            aggregation: 'event',
            start_time: dayAgo,
            data: [{ value: 'Lead', count: 1 }],
          },
        ],
      });
    });

    const overview = await service.getOverview(7);

    expect(overview.daily.length).toBeGreaterThanOrEqual(7);
    expect(
      overview.daily.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.date)),
    ).toBe(true);
    const leadDays = overview.daily.filter((d) => d.counts.Lead);
    expect(leadDays).toHaveLength(1);
    expect(leadDays[0].counts.Lead).toBe(3);
  });

  it('reads campaign results per ad account and prefers the total lead action', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/me/adaccounts')) {
        return jsonResponse({
          data: [
            {
              id: 'act_267033678',
              account_id: '267033678',
              name: 'CortanaSoft',
              currency: 'USD',
            },
          ],
        });
      }
      if (url.includes('/act_267033678/campaigns')) {
        return jsonResponse({
          data: [
            { id: 'c1', name: 'Cortana Leads', effective_status: 'PAUSED' },
          ],
        });
      }
      if (url.includes('/act_267033678/insights')) {
        return jsonResponse({
          data: [
            {
              campaign_id: 'c1',
              campaign_name: 'Cortana Leads',
              spend: '41.01',
              impressions: '5000',
              clicks: '120',
              actions: [
                { action_type: 'offsite_conversion.fb_pixel_lead', value: '1' },
                { action_type: 'lead', value: '1' },
              ],
            },
          ],
        });
      }
      return jsonResponse({ data: [] });
    });

    const ads = await service.getAdsOverview(7);

    expect(ads.accounts).toHaveLength(1);
    const account = ads.accounts[0];
    expect(account.currency).toBe('USD');
    expect(account.campaigns[0]).toMatchObject({
      id: 'c1',
      status: 'PAUSED',
      spend: 41.01,
      impressions: 5000,
      clicks: 120,
      ctr: 2.4,
      leads: 1,
      costPerLead: 41.01,
    });
    expect(account.totals.leads).toBe(1);
    expect(account.last7.spend).toBe(41.01);
    expect(ads.warnings).toEqual([]);
  });

  it('surfaces the Meta error when ad accounts cannot be listed', async () => {
    fetchMock.mockImplementation(() =>
      jsonResponse(
        { error: { message: '(#100) Missing Permission', code: 100 } },
        400,
      ),
    );

    await expect(service.getAdsOverview(30)).rejects.toThrow(
      '(#100) Missing Permission',
    );
  });

  it('clamps the range to the 7 days Meta supports', async () => {
    fetchMock.mockImplementation(() => jsonResponse({ data: [] }));

    const overview = await service.getOverview(30);

    const spanDays =
      (new Date(overview.rangeEnd).getTime() -
        new Date(overview.rangeStart).getTime()) /
      86_400_000;
    expect(spanDays).toBeCloseTo(7, 5);
  });
});
