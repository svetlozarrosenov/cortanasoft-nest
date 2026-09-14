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
 */
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
  /** Управител / представляващ (МОЛ) */
  manager: string | null;
  activity: string | null;
  nkid: string | null;
  vatRegistered: boolean | null;
  vatNumber: string | null;
  source: 'registry' | 'vies' | 'none';
  fetchedAt: string;
}

interface DeedField {
  nameCode: string;
  htmlData?: string;
}
interface Deed {
  deedStatus?: number;
  companyName?: string;
  fullName?: string;
  uic?: string;
  sections?: Array<{
    nameCode: string;
    subDeeds?: Array<{
      groups?: Array<{ nameCode: string; fields?: DeedField[] }>;
    }>;
  }>;
}

const REGISTRY_URL = 'https://portal.registryagency.bg/CR/api/Deeds/';
const VIES_URL = 'https://ec.europa.eu/taxation_customs/vies/rest-api/ms/BG/vat/';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MIN_GAP_MS = 1500;
const RETRY_AFTER_429_MS = 9000;

function stripHtml(html: string): string {
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

@Injectable()
export class CompanyLookupService {
  private readonly logger = new Logger(CompanyLookupService.name);
  private cache = new Map<string, { at: number; value: CompanyLookupResult }>();
  private inflight = new Map<string, Promise<CompanyLookupResult>>();
  private queue: Promise<unknown> = Promise.resolve();
  private lastCall = 0;

  async lookup(eikRaw: string): Promise<CompanyLookupResult> {
    const eik = (eikRaw || '').replace(/\D/g, '');
    if (!/^\d{9}$|^\d{13}$/.test(eik)) {
      throw new BadRequestException('ЕИК трябва да е 9 или 13 цифри');
    }
    const cached = this.cache.get(eik);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;
    const running = this.inflight.get(eik);
    if (running) return running;

    const p = this.fetchAll(eik)
      .then((value) => {
        if (value.found || value.vatRegistered) {
          this.cache.set(eik, { at: Date.now(), value });
        }
        return value;
      })
      .finally(() => this.inflight.delete(eik));
    this.inflight.set(eik, p);
    return p;
  }

  private async fetchAll(eik: string): Promise<CompanyLookupResult> {
    const [registry, vies] = await Promise.all([
      this.fetchRegistry(eik),
      this.fetchVies(eik),
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
      vatRegistered: vies ? vies.valid : null,
      vatNumber: vies?.valid ? `BG${eik}` : null,
      source: 'none',
      fetchedAt: new Date().toISOString(),
    };
    if (registry) return { ...base, ...registry, found: true, source: 'registry' };
    if (vies?.valid) {
      const addr = this.splitViesAddress(vies.address);
      return { ...base, ...addr, found: true, fullName: vies.name, name: vies.name, source: 'vies' };
    }
    return base;
  }

  /** Една заявка към портала в даден момент, с пауза и един retry при 429. */
  private throttled<T>(fn: () => Promise<T>): Promise<T> {
    const run = async () => {
      const wait = Math.max(0, this.lastCall + MIN_GAP_MS - Date.now());
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      this.lastCall = Date.now();
      return fn();
    };
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => undefined);
    return p;
  }

  private async fetchRegistry(eik: string) {
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
        await new Promise((r) => setTimeout(r, RETRY_AFTER_429_MS));
        res = await this.throttled(get);
      }
      if (res.status === 429) {
        throw new ServiceUnavailableException(
          'Търговският регистър ограничава заявките в момента. Опитайте след няколко секунди.',
        );
      }
      if (!res.ok) {
        this.logger.warn(`Registry lookup ${eik}: HTTP ${res.status}`);
        return null;
      }
      const text = await res.text();
      if (!text.trim()) return null; // несъществуващ ЕИК → 200 с празно тяло
      const deed = JSON.parse(text) as Deed;
      if (!deed || !deed.uic) return null;
      return this.parseDeed(deed);
    } catch (e) {
      if (e instanceof ServiceUnavailableException) throw e;
      this.logger.warn(`Registry lookup ${eik} failed: ${(e as Error).message}`);
      return null;
    }
  }

  private parseDeed(deed: Deed) {
    const fields = new Map<string, string>();
    for (const sec of deed.sections || []) {
      if (sec.nameCode !== 'CR_GL_GENERAL_STATUS_L') continue;
      for (const sd of sec.subDeeds || [])
        for (const g of sd.groups || [])
          for (const f of g.fields || [])
            if (f.htmlData && !fields.has(f.nameCode)) fields.set(f.nameCode, stripHtml(f.htmlData));
    }
    const name = fields.get('CR_F_2_L') || deed.companyName || null;
    const seat = fields.get('CR_F_5_L') || '';
    const addr = this.parseSeat(seat);
    const managerRaw = fields.get('CR_F_7_L') || '';
    const manager = managerRaw ? managerRaw.split(/,\s*Държава:/)[0].trim() || null : null;
    const nkidRaw = fields.get('CR_F_6a_L') || '';
    const nkid = nkidRaw ? (nkidRaw.match(/Група по НКИД:\s*([\d.]+)/)?.[1] ?? null) : null;
    return {
      fullName: (deed.fullName || '').trim() || name,
      name,
      latinName: this.cleanLatin(fields.get('CR_F_4_L') || null),
      legalForm: fields.get('CR_F_3_L') || null,
      ...addr,
      manager,
      activity: fields.get('CR_F_6_L') || null,
      nkid,
    };
  }

  private cleanLatin(v: string | null) {
    return v ? v.replace(/[‘’'"„“]/g, '').trim() || null : null;
  }

  /**
   * „Държава: БЪЛГАРИЯ\nОбласт: София (столица), Община: Столична\nНаселено
   * място: гр. София, п.к. 1700\nр-н Витоша\nбул./ул. Леа Иванова № 2, вх. Б …
   * Адрес на електронна поща: x@y" → град, п.к., адрес, област, имейл.
   */
  private parseSeat(seat: string) {
    const out = { address: null as string | null, city: null as string | null, postalCode: null as string | null, region: null as string | null, email: null as string | null };
    if (!seat) return out;
    let s = seat;
    const emailM = s.match(/Адрес на електронна поща:\s*([^\s]+@[^\s]+)/);
    if (emailM) {
      out.email = emailM[1].replace(/[.,;]+$/, '');
      s = s.replace(/Адрес на електронна поща:.*$/s, '');
    }
    const lines = s.split('\n').map((l) => l.trim()).filter(Boolean);
    const rest: string[] = [];
    for (const line of lines) {
      if (/^Държава:/.test(line)) continue;
      const regionM = line.match(/^Област:\s*([^,]+)/);
      if (regionM) {
        out.region = regionM[1].trim();
        continue;
      }
      const placeM = line.match(/^Населено място:\s*(.+?)(?:,\s*п\.к\.\s*(\d{4}))?$/);
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

  private splitViesAddress(address: string | null) {
    // VIES: " жк ж.к. Банишора ул. Скопие  №1А обл.СОФИЯ, гр.СОФИЯ 1233"
    const a = (address || '').replace(/\s+/g, ' ').trim();
    const m = a.match(/гр\.\s*([^\d,]+?)\s*(\d{4})?\s*$/i);
    return {
      address: a || null,
      city: m ? m[1].trim() : null,
      postalCode: m?.[2] ?? null,
    };
  }

  private async fetchVies(eik: string): Promise<{ valid: boolean; name: string | null; address: string | null } | null> {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 6000);
    try {
      const res = await fetch(VIES_URL + eik, {
        signal: controller.signal,
        headers: { Accept: 'application/json', 'Accept-Language': 'en' },
      });
      if (!res.ok) return null;
      const j = (await res.json()) as { isValid?: boolean; name?: string; address?: string; userError?: string };
      if (j.userError && !['VALID', 'INVALID'].includes(j.userError)) return null; // напр. MS_UNAVAILABLE
      return { valid: !!j.isValid, name: (j.name || '').trim() || null, address: (j.address || '').trim() || null };
    } catch {
      return null;
    } finally {
      clearTimeout(t);
    }
  }
}
