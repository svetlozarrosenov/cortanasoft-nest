import {
  Injectable,
  Logger,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';

/**
 * Справка за българска фирма по ЕИК.
 *
 * Източници:
 *  - Търговският регистър през вътрешния JSON API на новия портал
 *    (portal.registryagency.bg/CR/api/Deeds/{EIK}) — недокументиран, без ключ.
 *    Полетата идват като HTML фрагменти с кодове CR_F_x_L. Лимитира бързи
 *    серии (429 за ~8 s), затова заявките минават една по една с пауза и
 *    резултатът се кешира по ЕИК.
 *  - EU VIES (официален REST, без ключ) — дали фирмата е по ДДС; дава име
 *    и адрес само за регистрираните. Ползва се за vatNumber/vatRegistered.
 * Нищо не се пази в базата; кешът е в паметта на процеса.
 *
 * Грешките към клиента носят `code`, за да може фронтендът да ги преведе:
 *  EIK_INVALID (400), REGISTRY_RATE_LIMITED / REGISTRY_UNAVAILABLE /
 *  REGISTRY_BUSY (503).
 */

/**
 * Състояние на фирмата по партидата. Наблюдавано на живо (2026-09-14):
 * deedStatus 1 = действаща; 2 = открито производство по несъстоятелност
 * (fullName завършва на „- в несъстоятелност“, секция CR_GL_INSOLVENCY_L е
 * отворена). Ликвидацията се разпознава по същия начин („- в ликвидация“ /
 * CR_GL_LIQUIDATION_L). Всичко друго извън deedStatus 1 (заличена, прекратена
 * дейност — поле CR_F_26_L) се докладва като `inactive`.
 */
export type CompanyStatus =
  | 'active'
  | 'liquidation'
  | 'insolvency'
  | 'inactive';

export type CompanyLookupErrorCode =
  | 'EIK_INVALID'
  | 'REGISTRY_RATE_LIMITED'
  | 'REGISTRY_UNAVAILABLE'
  | 'REGISTRY_BUSY';

export interface CompanyLookupResult {
  eik: string;
  found: boolean;
  /** Пълно наименование с правната форма, напр. „Електрик експрес" ЕООД */
  fullName: string | null;
  /** Наименование без правната форма */
  name: string | null;
  latinName: string | null;
  legalForm: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  region: string | null;
  email: string | null;
  /** Управител(и) / представляващ(и) (МОЛ); при няколко — разделени със запетая */
  manager: string | null;
  activity: string | null;
  nkid: string | null;
  /** null = регистърът не дава партида (source: vies/none) */
  status: CompanyStatus | null;
  vatRegistered: boolean | null;
  vatNumber: string | null;
  source: 'registry' | 'vies' | 'none';
  fetchedAt: string;
}

interface DeedField {
  nameCode: string;
  htmlData?: string;
}
export interface Deed {
  deedStatus?: number;
  companyName?: string;
  fullName?: string;
  uic?: string;
  sections?: Array<{
    nameCode: string;
    subDeeds?: Array<{
      subDeedIsClosed?: boolean;
      groups?: Array<{ nameCode: string; fields?: DeedField[] }>;
    }>;
  }>;
}

const REGISTRY_URL = 'https://portal.registryagency.bg/CR/api/Deeds/';
const VIES_URL =
  'https://ec.europa.eu/taxation_customs/vies/rest-api/ms/BG/vat/';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const NOT_FOUND_TTL_MS = 10 * 60 * 1000;
/** Регистърът отговори, но VIES не (vatRegistered: null) — не замразяваме
 * „неизвестно" за цял ден, а само за кратко. */
const UNKNOWN_VAT_TTL_MS = 5 * 60 * 1000;
const VIES_RETRY_MS = 1000;
const CACHE_MAX = 500;
const MIN_GAP_MS = 1500;
const RETRY_AFTER_429_MS = 9000;
/** Максимум чакащи заявки към портала; над това връщаме „заето“ вместо да
 * трупаме опашка, която бави всички компании по 1.5 s на заявка. */
const MAX_WAITING = 8;

type RegistryFetch =
  | { status: 'ok'; data: ReturnType<CompanyLookupService['parseDeed']> }
  | { status: 'notFound' }
  | { status: 'unavailable'; error?: ServiceUnavailableException };

/** Колко време е валиден кеширан резултат според това какво знаем. */
function ttlFor(value: CompanyLookupResult): number {
  if (!value.found) return NOT_FOUND_TTL_MS;
  if (value.vatRegistered === null) return UNKNOWN_VAT_TTL_MS;
  return CACHE_TTL_MS;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

function unavailable(code: CompanyLookupErrorCode, message: string) {
  return new ServiceUnavailableException({ statusCode: 503, message, code });
}

@Injectable()
export class CompanyLookupService {
  private readonly logger = new Logger(CompanyLookupService.name);
  private cache = new Map<string, { at: number; value: CompanyLookupResult }>();
  private inflight = new Map<string, Promise<CompanyLookupResult>>();
  private queue: Promise<unknown> = Promise.resolve();
  private lastCall = 0;
  /** След 429 от портала — всички чакащи заявки изчакват до този момент */
  private cooldownUntil = 0;
  /** Брой заявки, наредени на опашката и още непуснати */
  private waiting = 0;

  async lookup(eikRaw: string): Promise<CompanyLookupResult> {
    const eik = (eikRaw || '').replace(/\D/g, '');
    if (!/^\d{9}$|^\d{13}$/.test(eik)) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'ЕИК трябва да е 9 или 13 цифри',
        code: 'EIK_INVALID' satisfies CompanyLookupErrorCode,
      });
    }
    const cached = this.cache.get(eik);
    if (cached) {
      if (Date.now() - cached.at < ttlFor(cached.value)) return cached.value;
      this.cache.delete(eik);
    }
    const running = this.inflight.get(eik);
    if (running) return running;

    const p = this.fetchAll(eik)
      .then((value) => {
        // Кешираме и „няма такава фирма" (кратко), за да не удряме портала
        // при повторни опити с грешен ЕИК. „Не отговаря" не се кешира.
        this.remember(eik, value);
        return value;
      })
      .finally(() => this.inflight.delete(eik));
    this.inflight.set(eik, p);
    return p;
  }

  private remember(eik: string, value: CompanyLookupResult) {
    if (this.cache.size >= CACHE_MAX) {
      const now = Date.now();
      for (const [k, v] of this.cache) {
        if (now - v.at >= ttlFor(v.value)) this.cache.delete(k);
      }
      // Ако и след чистенето е пълен — вадим най-старите (Map пази реда на вмъкване)
      while (this.cache.size >= CACHE_MAX) {
        const oldest = this.cache.keys().next().value as string | undefined;
        if (oldest === undefined) break;
        this.cache.delete(oldest);
      }
    }
    this.cache.set(eik, { at: Date.now(), value });
  }

  private async fetchAll(eik: string): Promise<CompanyLookupResult> {
    // ЕИК на клон е 13 цифри (ЕИК на фирмата + 4). Клонът няма свой ДДС
    // номер — той е на фирмата-майка, затова VIES се пита с първите 9 цифри.
    const viesEik = eik.length === 13 ? eik.slice(0, 9) : eik;
    const [registry, vies] = await Promise.all([
      // „Заето"/„ограничава заявки" не са краят: ако VIES потвърди фирмата,
      // връщаме поне име и адрес от него; грешката се хвърля само ако и
      // VIES не помогне.
      this.fetchRegistry(eik).catch((e: unknown): RegistryFetch => {
        if (e instanceof ServiceUnavailableException) {
          return { status: 'unavailable', error: e };
        }
        throw e;
      }),
      this.fetchViesWithRetry(viesEik),
    ]);
    const base: CompanyLookupResult = {
      eik,
      found: false,
      fullName: null,
      name: null,
      latinName: null,
      legalForm: null,
      address: null,
      city: null,
      postalCode: null,
      region: null,
      email: null,
      manager: null,
      activity: null,
      nkid: null,
      status: null,
      vatRegistered: vies ? vies.valid : null,
      vatNumber: vies?.valid ? `BG${viesEik}` : null,
      source: 'none',
      fetchedAt: new Date().toISOString(),
    };
    if (registry.status === 'ok') {
      return { ...base, ...registry.data, found: true, source: 'registry' };
    }
    if (vies?.valid) {
      const addr = this.splitViesAddress(vies.address);
      return {
        ...base,
        ...addr,
        found: true,
        fullName: vies.name,
        name: vies.name,
        source: 'vies',
      };
    }
    // Регистърът не отговори и VIES не потвърди фирмата: НЕ казваме
    // „няма такава фирма" — това би подвело оператора.
    if (registry.status === 'unavailable') {
      throw (
        registry.error ??
        unavailable(
          'REGISTRY_UNAVAILABLE',
          'Търговският регистър не отговаря в момента. Опитайте отново след малко.',
        )
      );
    }
    return base;
  }

  /**
   * VIES често отговаря MS_MAX_CONCURRENT_REQ на втора бърза заявка. Един
   * повторен опит след секунда, преди да кажем „не можа да се провери".
   */
  private async fetchViesWithRetry(eik: string) {
    const first = await this.fetchVies(eik);
    if (first) return first;
    await new Promise((r) => setTimeout(r, VIES_RETRY_MS));
    return this.fetchVies(eik);
  }

  /** Една заявка към портала в даден момент, с пауза и таван на чакащите. */
  private throttled<T>(fn: () => Promise<T>): Promise<T> {
    if (this.waiting >= MAX_WAITING) {
      throw unavailable(
        'REGISTRY_BUSY',
        'Твърде много справки в момента. Опитайте след няколко секунди.',
      );
    }
    this.waiting++;
    const run = async () => {
      this.waiting--;
      const wait = Math.max(
        0,
        this.lastCall + MIN_GAP_MS - Date.now(),
        this.cooldownUntil - Date.now(),
      );
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      this.lastCall = Date.now();
      return fn();
    };
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => undefined);
    return p;
  }

  private async fetchRegistry(eik: string): Promise<RegistryFetch> {
    const get = async () => {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 12000);
      try {
        return await fetch(REGISTRY_URL + eik, {
          // Порталът (ASP.NET) връща 500 при Accept-Language: * (default на
          // undici fetch) — задаваме изрично език.
          headers: {
            Accept: 'application/json',
            'Accept-Language': 'bg-BG,bg;q=0.9,en;q=0.8',
            'User-Agent': 'CortanaSoft/1.0 (+https://cortanasoft.com)',
          },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(t);
      }
    };
    try {
      let res = await this.throttled(get);
      if (res.status === 429) {
        // Глобален cooldown: и другите чакащи заявки изчакват, вместо всяка
        // да получи 429 и да повтаря сама.
        this.cooldownUntil = Date.now() + RETRY_AFTER_429_MS;
        res = await this.throttled(get);
      }
      if (res.status === 429) {
        this.cooldownUntil = Date.now() + RETRY_AFTER_429_MS;
        throw unavailable(
          'REGISTRY_RATE_LIMITED',
          'Търговският регистър ограничава заявките в момента. Опитайте след няколко секунди.',
        );
      }
      if (!res.ok) {
        this.logger.warn(`Registry lookup ${eik}: HTTP ${res.status}`);
        return { status: 'unavailable' };
      }
      const text = await res.text();
      if (!text.trim()) return { status: 'notFound' }; // несъществуващ ЕИК → 200 с празно тяло
      let deed: Deed;
      try {
        deed = JSON.parse(text) as Deed;
      } catch {
        this.logger.warn(`Registry lookup ${eik}: non-JSON body`);
        return { status: 'unavailable' };
      }
      if (!deed || !deed.uic) return { status: 'notFound' };
      const data = this.parseDeed(deed);
      if (!data.name) {
        // Партида има, но не разпознаваме полетата — форматът на портала се
        // е сменил. По-добре „не отговаря“, отколкото да изтрием името.
        this.logger.warn(
          `Registry lookup ${eik}: deed without recognisable name`,
        );
        return { status: 'unavailable' };
      }
      return { status: 'ok', data };
    } catch (e) {
      if (e instanceof ServiceUnavailableException) throw e;
      // мрежова грешка / timeout
      this.logger.warn(
        `Registry lookup ${eik} failed: ${(e as Error).message}`,
      );
      return { status: 'unavailable' };
    }
  }

  parseDeed(deed: Deed) {
    const fields = new Map<string, string>();
    const openSections = new Set<string>();
    for (const sec of deed.sections || []) {
      if ((sec.subDeeds || []).some((sd) => !sd.subDeedIsClosed))
        openSections.add(sec.nameCode);
      if (sec.nameCode !== 'CR_GL_GENERAL_STATUS_L') continue;
      for (const sd of sec.subDeeds || [])
        for (const g of sd.groups || [])
          for (const f of g.fields || [])
            if (f.htmlData && !fields.has(f.nameCode))
              fields.set(f.nameCode, stripHtml(f.htmlData));
    }
    const name = fields.get('CR_F_2_L') || deed.companyName || null;
    const seat = fields.get('CR_F_5_L') || '';
    const addr = this.parseSeat(seat);
    const nkidRaw = fields.get('CR_F_6a_L') || '';
    const nkid = nkidRaw
      ? (nkidRaw.match(/Група по НКИД:\s*([\d.]+)/)?.[1] ?? null)
      : null;
    return {
      fullName: (deed.fullName || '').trim() || name,
      name,
      latinName: this.cleanLatin(fields.get('CR_F_4_L') || null),
      legalForm: fields.get('CR_F_3_L') || null,
      ...addr,
      manager: this.parseManagers(fields.get('CR_F_7_L') || ''),
      activity: fields.get('CR_F_6_L') || null,
      nkid,
      status: this.deriveStatus(deed, fields, openSections),
    };
  }

  /**
   * „Иван Иванов, Държава: БЪЛГАРИЯ\nПетър Петров, Държава: БЪЛГАРИЯ" →
   * „Иван Иванов, Петър Петров". Един ред = един представляващ.
   */
  parseManagers(raw: string): string | null {
    const names = raw
      .split('\n')
      .map((l) => l.split(/,\s*Държава:/)[0].trim())
      .filter(Boolean);
    return names.length ? Array.from(new Set(names)).join(', ') : null;
  }

  deriveStatus(
    deed: Deed,
    fields: Map<string, string>,
    openSections: Set<string>,
  ): CompanyStatus {
    const full = (deed.fullName || '').toLowerCase();
    if (/в ликвидация/.test(full) || openSections.has('CR_GL_LIQUIDATION_L'))
      return 'liquidation';
    if (
      /в несъстоятелност/.test(full) ||
      openSections.has('CR_GL_INSOLVENCY_L')
    )
      return 'insolvency';
    // CR_F_26_L = „Прекратяване на търговската дейност“
    if (deed.deedStatus === 1 && !fields.has('CR_F_26_L')) return 'active';
    return 'inactive';
  }

  private cleanLatin(v: string | null) {
    return v ? v.replace(/[‘’'"„“]/g, '').trim() || null : null;
  }

  /**
   * „Държава: БЪЛГАРИЯ\nОбласт: София (столица), Община: Столична\nНаселено
   * място: гр. София, п.к. 1700\nр-н Витоша\nбул./ул. Леа Иванова № 2, вх. Б …
   * Адрес на електронна поща: x@y" → град, п.к., адрес, област, имейл.
   */
  parseSeat(seat: string) {
    const out = {
      address: null as string | null,
      city: null as string | null,
      postalCode: null as string | null,
      region: null as string | null,
      email: null as string | null,
    };
    if (!seat) return out;
    let s = seat;
    const emailM = s.match(/Адрес на електронна поща:\s*([^\s]+@[^\s]+)/);
    if (emailM) {
      out.email = emailM[1].replace(/[.,;]+$/, '');
      s = s.replace(/Адрес на електронна поща:.*$/s, '');
    }
    const lines = s
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const rest: string[] = [];
    for (const line of lines) {
      if (/^Държава:/.test(line)) continue;
      const regionM = line.match(/^Област:\s*([^,]+)/);
      if (regionM) {
        out.region = regionM[1].trim();
        continue;
      }
      const placeM = line.match(
        /^Населено място:\s*(.+?)(?:,\s*п\.к\.\s*(\d{4}))?$/,
      );
      if (placeM) {
        out.city = placeM[1].replace(/^(гр\.|с\.|град|село)\s*/i, '').trim();
        if (placeM[2]) out.postalCode = placeM[2];
        continue;
      }
      rest.push(line.replace(/^бул\.\/ул\.\s*/i, ''));
    }
    out.address = rest.join(', ').replace(/\s+,/g, ',').trim() || null;
    return out;
  }

  splitViesAddress(address: string | null) {
    // VIES: " жк ж.к. Банишора ул. Скопие  №1А обл.СОФИЯ, гр.СОФИЯ 1233"
    const a = (address || '').replace(/\s+/g, ' ').trim();
    const m = a.match(/гр\.\s*([^\d,]+?)\s*(\d{4})?\s*$/i);
    return {
      address: a || null,
      city: m ? m[1].trim() : null,
      postalCode: m?.[2] ?? null,
    };
  }

  private async fetchVies(eik: string): Promise<{
    valid: boolean;
    name: string | null;
    address: string | null;
  } | null> {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 6000);
    try {
      const res = await fetch(VIES_URL + eik, {
        signal: controller.signal,
        headers: { Accept: 'application/json', 'Accept-Language': 'en' },
      });
      if (!res.ok) return null;
      const j = (await res.json()) as {
        isValid?: boolean;
        name?: string;
        address?: string;
        userError?: string;
      };
      if (j.userError && !['VALID', 'INVALID'].includes(j.userError))
        return null; // напр. MS_UNAVAILABLE
      return {
        valid: !!j.isValid,
        name: (j.name || '').trim() || null,
        address: (j.address || '').trim() || null,
      };
    } catch {
      return null;
    } finally {
      clearTimeout(t);
    }
  }
}
