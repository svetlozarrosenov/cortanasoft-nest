import { readFileSync } from 'fs';
import { join } from 'path';
import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  CompanyLookupService,
  Deed,
  stripHtml,
} from './company-lookup.service';

// Реален отговор на portal.registryagency.bg (2026-09-14), само общата
// секция, с анонимизиран управител и имейл. Ако порталът смени формата,
// тези тестове трябва да го хванат.
const activeDeed = JSON.parse(
  readFileSync(join(__dirname, '__fixtures__', 'deed-active.json'), 'utf8'),
) as Deed;

const REGISTRY = 'https://portal.registryagency.bg/CR/api/Deeds/';

type FakeResponse = {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
  json: () => Promise<unknown>;
};
const resp = (status: number, body: string | object): FakeResponse => {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(text),
    json: () => Promise.resolve(JSON.parse(text) as unknown),
  };
};
const viesValid = resp(200, {
  isValid: true,
  name: 'ЕЛЕКТРИК ЕКСПРЕС ЕООД',
  address: 'ул. Леа Иванова 2 обл.СОФИЯ, гр.СОФИЯ 1700',
});
const viesInvalid = resp(200, { isValid: false, userError: 'INVALID' });

const viesUnknown = resp(200, {
  isValid: false,
  userError: 'MS_MAX_CONCURRENT_REQ',
});

function mockFetch(
  registry: FakeResponse | (() => FakeResponse),
  vies: FakeResponse | (() => FakeResponse),
) {
  const pick = (r: FakeResponse | (() => FakeResponse)) =>
    typeof r === 'function' ? r() : r;
  const fn = jest.fn((url: string) =>
    Promise.resolve(url.startsWith(REGISTRY) ? pick(registry) : pick(vies)),
  );
  (global as unknown as { fetch: unknown }).fetch = fn;
  return fn;
}

describe('CompanyLookupService parsers', () => {
  const service = new CompanyLookupService();

  it('stripHtml turns <br> into newlines and drops tags/entities', () => {
    expect(stripHtml("<p class='x'>A &amp; B<br/>C&nbsp;D</p>")).toBe(
      'A & B\nC D',
    );
  });

  it('parses a real active deed', () => {
    const r = service.parseDeed(activeDeed);
    expect(r.name).toBe('Електрик експрес');
    // кавичките от регистъра падат (както при латинското име)
    expect(r.fullName).toBe('Електрик експрес ЕООД');
    expect(r.name).toBe('Електрик експрес');
    expect(r.latinName).toBe('Electric express S. P. Ltd.');
    expect(r.legalForm).toBe('Еднолично дружество с ограничена отговорност');
    expect(r.region).toBe('София (столица)');
    expect(r.city).toBe('София');
    expect(r.postalCode).toBe('1700');
    expect(r.address).toBe('р-н Витоша, Леа Иванова № 2, вх. Б, ет. 5, ап. 12');
    expect(r.email).toBe('office@example.bg');
    expect(r.manager).toBe('Иван Петров Иванов');
    expect(r.nkid).toBe('47.91');
    expect(r.status).toBe('active');
  });

  it('joins several managers, one per line, without duplicates', () => {
    expect(
      service.parseManagers(
        'Иван Иванов, Държава: БЪЛГАРИЯ\nПетър Петров, Държава: БЪЛГАРИЯ\nИван Иванов, Държава: БЪЛГАРИЯ',
      ),
    ).toBe('Иван Иванов, Петър Петров');
    expect(service.parseManagers('')).toBeNull();
  });

  it('parses a village seat without postal code', () => {
    const r = service.parseSeat(
      'Държава: БЪЛГАРИЯ\nОбласт: Ловеч, Община: Троян\nНаселено място: с. Орешак\nул. Първа № 1',
    );
    expect(r).toEqual({
      address: 'ул. Първа № 1',
      city: 'Орешак',
      postalCode: null,
      region: 'Ловеч',
      email: null,
    });
  });

  it('splits a VIES address into city and postal code', () => {
    expect(
      service.splitViesAddress(
        ' жк ж.к. Банишора ул. Скопие  №1А обл.СОФИЯ, гр.СОФИЯ 1233',
      ),
    ).toEqual({
      address: 'жк ж.к. Банишора ул. Скопие №1А обл.СОФИЯ, гр.СОФИЯ 1233',
      city: 'СОФИЯ',
      postalCode: '1233',
    });
  });

  describe('deriveStatus', () => {
    const fields = new Map<string, string>();
    it('insolvency by name suffix or open insolvency section', () => {
      expect(
        service.deriveStatus(
          { deedStatus: 2, fullName: '"X" АД - в несъстоятелност' },
          fields,
          new Set(),
        ),
      ).toBe('insolvency');
      expect(
        service.deriveStatus(
          { deedStatus: 2, fullName: '"X" АД' },
          fields,
          new Set(['CR_GL_INSOLVENCY_L']),
        ),
      ).toBe('insolvency');
    });
    it('liquidation wins over insolvency', () => {
      expect(
        service.deriveStatus(
          { deedStatus: 2, fullName: '"X" ООД - в ликвидация' },
          fields,
          new Set(['CR_GL_INSOLVENCY_L']),
        ),
      ).toBe('liquidation');
    });
    it('inactive when the deed is not status 1 or trading has ceased', () => {
      expect(
        service.deriveStatus(
          { deedStatus: 3, fullName: '"X" ООД' },
          fields,
          new Set(),
        ),
      ).toBe('inactive');
      expect(
        service.deriveStatus(
          { deedStatus: 1, fullName: '"X" ООД' },
          new Map([['CR_F_26_L', 'Прекратяване на търговската дейност']]),
          new Set(),
        ),
      ).toBe('inactive');
    });
    it('does not count a closed insolvency section', () => {
      const r = service.parseDeed({
        ...activeDeed,
        sections: [
          ...(activeDeed.sections || []),
          {
            nameCode: 'CR_GL_INSOLVENCY_L',
            subDeeds: [{ subDeedIsClosed: true, groups: [] }],
          },
        ],
      });
      expect(r.status).toBe('active');
    });
  });
});

describe('CompanyLookupService.lookup', () => {
  let service: CompanyLookupService;
  beforeEach(() => {
    jest.useFakeTimers();
    service = new CompanyLookupService();
  });
  afterEach(() => jest.useRealTimers());

  // Изчакваме паузите на опашката (1.5 s между заявки, 9 s след 429).
  // Handler-ите се закачат ПРЕДИ да въртим таймерите, иначе отхвърлянето
  // остава „unhandled" докато таймерите вървят.
  const run = async <T>(p: Promise<T>) => {
    const settled = p.then(
      (v) => ({ ok: true as const, v }),
      (e: unknown) => ({ ok: false as const, e }),
    );
    await jest.advanceTimersByTimeAsync(20000);
    const r = await settled;
    if (r.ok) return r.v;
    throw r.e;
  };
  const runError = async (p: Promise<unknown>, code: string) => {
    const settled = p.then(
      () => null,
      (e: unknown) => e,
    );
    await jest.advanceTimersByTimeAsync(20000);
    const e = await settled;
    expect(e).toBeInstanceOf(ServiceUnavailableException);
    expect((e as ServiceUnavailableException).getResponse()).toMatchObject({
      code,
    });
  };

  it('rejects an EIK that is not 9 or 13 digits with a code', async () => {
    await expect(service.lookup('12345')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await service.lookup('12345').catch((e: BadRequestException) => {
      expect((e.getResponse() as { code: string }).code).toBe('EIK_INVALID');
    });
  });

  it('combines registry and VIES, then serves the cache', async () => {
    const fetch = mockFetch(resp(200, activeDeed), viesValid);
    const r = await run(service.lookup('207 510 146'));
    expect(r.found).toBe(true);
    expect(r.source).toBe('registry');
    expect(r.eik).toBe('207510146');
    expect(r.vatRegistered).toBe(true);
    expect(r.vatNumber).toBe('BG207510146');
    expect(r.status).toBe('active');
    expect(fetch).toHaveBeenCalledTimes(2);
    await run(service.lookup('207510146'));
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('asks VIES for the parent company when the EIK is a 13-digit branch', async () => {
    const fetch = mockFetch(resp(200, activeDeed), viesValid);
    const r = await run(service.lookup('2075101460017'));
    expect(r.eik).toBe('2075101460017');
    const viesUrl = fetch.mock.calls
      .map(([u]) => u)
      .find((u) => !u.startsWith(REGISTRY));
    expect(viesUrl?.endsWith('/207510146')).toBe(true);
    expect(r.vatRegistered).toBe(true);
    expect(r.vatNumber).toBe('BG207510146');
  });

  it('retries VIES once after a transient error', async () => {
    let calls = 0;
    const fetch = mockFetch(resp(200, activeDeed), () =>
      calls++ === 0 ? viesUnknown : viesValid,
    );
    const r = await run(service.lookup('207510146'));
    expect(r.vatRegistered).toBe(true);
    expect(
      fetch.mock.calls.filter(([u]) => !u.startsWith(REGISTRY)),
    ).toHaveLength(2);
  });

  it('caches an unknown VAT status only briefly', async () => {
    const fetch = mockFetch(resp(200, activeDeed), viesUnknown);
    const r = await run(service.lookup('207510146'));
    expect(r.found).toBe(true);
    expect(r.vatRegistered).toBeNull();
    const registryCalls = () =>
      fetch.mock.calls.filter(([u]) => u.startsWith(REGISTRY)).length;
    expect(registryCalls()).toBe(1);
    // В рамките на 5 минути — от кеша
    await run(service.lookup('207510146'));
    expect(registryCalls()).toBe(1);
    // След 5 минути — нова справка, за да не остане „неизвестно" цял ден
    await jest.advanceTimersByTimeAsync(5 * 60 * 1000);
    await run(service.lookup('207510146'));
    expect(registryCalls()).toBe(2);
  });

  it('rate-limited registry + VIES valid still returns VIES data', async () => {
    mockFetch(resp(429, ''), viesValid);
    const r = await run(service.lookup('207510146'));
    expect(r.found).toBe(true);
    expect(r.source).toBe('vies');
    expect(r.name).toBe('ЕЛЕКТРИК ЕКСПРЕС ЕООД');
  });

  it('empty registry body + VIES invalid = not found (cached briefly)', async () => {
    const fetch = mockFetch(resp(200, ''), viesInvalid);
    const r = await run(service.lookup('123456789'));
    expect(r.found).toBe(false);
    expect(r.vatRegistered).toBe(false);
    await run(service.lookup('123456789'));
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('registry down + VIES invalid = 503 REGISTRY_UNAVAILABLE, not cached', async () => {
    const fetch = mockFetch(resp(500, 'boom'), viesInvalid);
    await runError(service.lookup('123456789'), 'REGISTRY_UNAVAILABLE');
    await runError(service.lookup('123456789'), 'REGISTRY_UNAVAILABLE');
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('registry down + VIES valid falls back to VIES data', async () => {
    mockFetch(resp(500, 'boom'), viesValid);
    const r = await run(service.lookup('207510146'));
    expect(r.found).toBe(true);
    expect(r.source).toBe('vies');
    expect(r.name).toBe('ЕЛЕКТРИК ЕКСПРЕС ЕООД');
    expect(r.city).toBe('СОФИЯ');
    expect(r.status).toBeNull();
  });

  it('a deed without a recognisable name is treated as unavailable', async () => {
    mockFetch(resp(200, { uic: '123456789', sections: [] }), viesInvalid);
    await runError(service.lookup('123456789'), 'REGISTRY_UNAVAILABLE');
  });

  it('two 429s in a row = 503 REGISTRY_RATE_LIMITED', async () => {
    const fetch = mockFetch(resp(429, ''), viesInvalid);
    await runError(service.lookup('123456789'), 'REGISTRY_RATE_LIMITED');
    expect(
      fetch.mock.calls.filter(([u]) => u.startsWith(REGISTRY)),
    ).toHaveLength(2);
  });

  it('refuses with REGISTRY_BUSY when too many lookups are waiting', async () => {
    mockFetch(resp(200, activeDeed), viesInvalid);
    const eiks = Array.from({ length: 10 }, (_, i) => String(100000000 + i));
    const all = Promise.allSettled(eiks.map((e) => service.lookup(e)));
    await jest.advanceTimersByTimeAsync(30000);
    const results = await all;
    // Първите 8 се нареждат, останалите получават „заето“ веднага
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(rejected).toHaveLength(2);
    for (const r of rejected) {
      expect(
        (r.reason as ServiceUnavailableException).getResponse(),
      ).toMatchObject({ code: 'REGISTRY_BUSY' });
    }
  });
});
