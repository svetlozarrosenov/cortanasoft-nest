/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';
import {
  PigeonCredentials,
  PigeonSettings,
  PigeonShipmentParams,
  PigeonAddressParams,
} from './interfaces';

// Pigeon Express API v1 (https://api-docs.pigeonexpress.com/). Ключовете за
// sandbox и live се дават от търговския им отдел — няма самообслужване.
const BASE_URLS: Record<PigeonCredentials['mode'], string> = {
  sandbox: 'https://api-demo.pigeonexpress.com/v1',
  live: 'https://api.pigeonexpress.com/v1',
};

/**
 * Кодове на допълнителните услуги (service_codes в заявката е обект, не
 * масив). Списъкът при Pigeon е динамичен (GET /additional-services); тези
 * три са от примерите в спецификацията им.
 * TODO(pigeon-codes): сверка с GET /additional-services при първите ключове.
 */
export const PIGEON_SERVICE = {
  cod: 'cod_amount',
  declaredValue: 'declared_value',
  smsReceiver: 'sms_notification_receiver',
} as const;

export class PigeonApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
  }
}

/**
 * Pure HTTP клиент към Pigeon Express. Не знае за Prisma.
 */
@Injectable()
export class PigeonApiService {
  private readonly logger = new Logger(PigeonApiService.name);

  private headers(creds: PigeonCredentials): Record<string, string> {
    return {
      'X-API-Key': creds.apiKey,
      'X-API-Secret': creds.apiSecret,
      Accept: 'application/json',
    };
  }

  private url(
    creds: PigeonCredentials,
    path: string,
    query?: Record<string, unknown>,
  ) {
    const base = BASE_URLS[creds.mode] || BASE_URLS.sandbox;
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query || {})) {
      if (v === undefined || v === null || v === '') continue;
      params.set(
        k,
        typeof v === 'object'
          ? JSON.stringify(v)
          : String(v as string | number | boolean),
      );
    }
    const qs = params.toString();
    return `${base}${path}${qs ? `?${qs}` : ''}`;
  }

  private async request<T = Record<string, any>>(
    creds: PigeonCredentials,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    opts: { query?: Record<string, unknown>; body?: unknown } = {},
  ): Promise<T> {
    const url = this.url(creds, path, opts.query);
    this.logger.debug(`→ ${method} ${url}`);
    if (opts.body)
      this.logger.debug(`→ Body: ${JSON.stringify(opts.body).slice(0, 2000)}`);

    const res = await fetch(url, {
      method,
      headers: {
        ...this.headers(creds),
        ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });

    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      throw new PigeonApiError(
        `Pigeon върна невалиден отговор (HTTP ${res.status}): ${text.slice(0, 200)}`,
        res.status,
      );
    }
    this.logger.debug(`← ${res.status} ${text.slice(0, 1000)}`);

    if (!res.ok || data?.success === false) {
      throw this.toError(res.status, data);
    }
    return data as T;
  }

  /**
   * Грешките на Pigeon: { success:false, message, errors: { поле: [съобщения] } }.
   * Събираме всички съобщения по полета в едно четимо изречение.
   */
  private toError(status: number, data: any): PigeonApiError {
    const fieldErrors: Record<string, string[]> = {};
    const parts: string[] = [];
    if (
      data?.errors &&
      typeof data.errors === 'object' &&
      !Array.isArray(data.errors)
    ) {
      for (const [field, msgs] of Object.entries<any>(data.errors)) {
        const list = Array.isArray(msgs) ? msgs.map(String) : [String(msgs)];
        fieldErrors[field] = list;
        parts.push(...list);
      }
    }
    const headline = data?.message ? String(data.message) : '';
    const detail = parts.filter((p) => p && p !== headline).join('; ');
    const message =
      status === 401
        ? 'Pigeon: невалиден API ключ или секрет'
        : status === 429
          ? 'Pigeon: твърде много заявки, опитайте след малко'
          : [headline, detail].filter(Boolean).join(': ') ||
            `Pigeon грешка (HTTP ${status})`;
    return new PigeonApiError(message, status, fieldErrors);
  }

  // ==================== Достъп ====================

  /** Най-евтината автентикирана заявка: запазените адреси на профила. */
  async testConnection(creds: PigeonCredentials) {
    const addresses = await this.listAddresses(creds);
    return { success: true, addresses: addresses.length };
  }

  // ==================== Номенклатури ====================

  async listCities(
    creds: PigeonCredentials,
    opts: { name?: string; postalCode?: string } = {},
  ) {
    const res = await this.request(creds, 'GET', '/cities', {
      query: { name: opts.name, postal_code: opts.postalCode, per_page: 100 },
    });
    return (res.data || []) as any[];
  }

  async listStreets(creds: PigeonCredentials, cityId: number, name?: string) {
    const res = await this.request(creds, 'GET', `/cities/${cityId}/streets`, {
      query: { name, per_page: 100 },
    });
    return (res.data || []) as any[];
  }

  async listOffices(
    creds: PigeonCredentials,
    opts: {
      type?: 'office' | 'locker';
      name?: string;
      cityId?: number;
      postalCode?: string;
    } = {},
  ) {
    const res = await this.request(creds, 'GET', '/offices', {
      query: {
        type: opts.type,
        name: opts.name,
        city_id: opts.cityId,
        postal_code: opts.postalCode,
        per_page: 100,
      },
    });
    return (res.data || []) as any[];
  }

  async getOffice(creds: PigeonCredentials, officeId: number) {
    const res = await this.request(creds, 'GET', `/offices/${officeId}`);
    return res.data ?? null;
  }

  async lockerAvailability(creds: PigeonCredentials, code: string) {
    const res = await this.request(
      creds,
      'GET',
      `/lockers/${encodeURIComponent(code)}/availability`,
    );
    return res.data ?? null;
  }

  async listAddresses(creds: PigeonCredentials) {
    const res = await this.request(creds, 'GET', '/addresses');
    return (res.data || []) as any[];
  }

  async listAdditionalServices(creds: PigeonCredentials) {
    const res = await this.request(creds, 'GET', '/additional-services');
    return (res.data || []) as any[];
  }

  async listShipmentStatuses(creds: PigeonCredentials) {
    const res = await this.request(creds, 'GET', '/shipment-statuses');
    return (res.data || []) as Array<{ code: string; name: string }>;
  }

  // ==================== Пратки ====================

  async calculate(
    creds: PigeonCredentials,
    settings: PigeonSettings,
    params: PigeonShipmentParams,
  ) {
    const body = this.buildCalculateBody(settings, params);
    const res = await this.request(creds, 'POST', '/shipments/calculate', {
      body,
    });
    return res.data ?? {};
  }

  async createShipment(
    creds: PigeonCredentials,
    settings: PigeonSettings,
    params: PigeonShipmentParams,
  ) {
    const body = this.buildShipmentBody(settings, params);
    const res = await this.request(creds, 'POST', '/shipments', { body });
    return res.data ?? {};
  }

  async track(creds: PigeonCredentials, referenceNumber: string) {
    const res = await this.request(
      creds,
      'GET',
      `/shipments/${encodeURIComponent(referenceNumber)}/track`,
    );
    return res.data ?? null;
  }

  /**
   * До 100 номера на заявка. Отговорът е обект по номер (или масив) — всяка
   * стойност е TrackingResponse или { error }. Нормализираме към Map.
   */
  async trackBulk(
    creds: PigeonCredentials,
    references: string[],
  ): Promise<Map<string, any>> {
    const res = await this.request(creds, 'POST', '/shipments/track/bulk', {
      body: { references },
    });
    const out = new Map<string, any>();
    const data = res.data;
    if (Array.isArray(data)) {
      for (const item of data) {
        const ref = item?.reference_number ?? item?.reference;
        if (ref) out.set(String(ref), item);
      }
    } else if (data && typeof data === 'object') {
      for (const [ref, item] of Object.entries<any>(data)) {
        // При вложено { shipments: {...} } / { results: {...} } слизаме едно ниво
        if (
          (ref === 'shipments' || ref === 'results') &&
          item &&
          typeof item === 'object' &&
          !item.reference_number
        ) {
          for (const [r2, i2] of Object.entries<any>(item))
            out.set(String(i2?.reference_number ?? r2), i2);
          continue;
        }
        out.set(String(item?.reference_number ?? ref), item);
      }
    }
    return out;
  }

  async cancel(creds: PigeonCredentials, referenceNumber: string) {
    const res = await this.request(
      creds,
      'POST',
      `/shipments/${encodeURIComponent(referenceNumber)}/cancel`,
    );
    return res.data ?? {};
  }

  /** Етикетът като PDF (лимит на Pigeon: 20 заявки/мин за етикети). */
  async getLabel(
    creds: PigeonCredentials,
    referenceNumber: string,
    format: 'default' | 'pdf150' | 'a4' = 'default',
  ): Promise<Buffer> {
    const url = this.url(
      creds,
      `/shipments/${encodeURIComponent(referenceNumber)}/label`,
      { format },
    );
    const res = await fetch(url, {
      method: 'GET',
      headers: { ...this.headers(creds), Accept: 'application/pdf' },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        /* не е JSON */
      }
      throw this.toError(res.status, data ?? { message: text.slice(0, 200) });
    }
    return Buffer.from(await res.arrayBuffer());
  }

  /**
   * Изплатени наложени платежи за период (най-много един месец). Сумите са в
   * EUR; датите са d-m-Y. Това е източникът за „НП записва плащане".
   */
  async listCompletedPayments(
    creds: PigeonCredentials,
    fromDate: string,
    toDate: string,
  ) {
    const res = await this.request(creds, 'GET', '/payments/completed', {
      query: { from_date: fromDate, to_date: toDate },
    });
    return (res.data?.rows || []) as Array<{
      waybill: string;
      external_reference: string;
      collected_date: string;
      paid_date: string;
      amount_eur: string;
    }>;
  }

  // ==================== Build request bodies ====================

  private buildAddress(a: PigeonAddressParams) {
    return {
      city_id: a.cityId,
      ...(a.streetId ? { street_id: a.streetId } : {}),
      ...(a.streetNumber ? { street_number: a.streetNumber } : {}),
      ...(a.buildingNumber ? { building_number: a.buildingNumber } : {}),
      ...(a.entrance ? { entrance: a.entrance } : {}),
      ...(a.floor ? { floor: a.floor } : {}),
      ...(a.apartment ? { apartment: a.apartment } : {}),
      ...(a.postalCode ? { postal_code: a.postalCode } : {}),
      ...(a.neighborhood ? { neighborhood: a.neighborhood } : {}),
      ...(a.additionalInfo ? { additional_info: a.additionalInfo } : {}),
    };
  }

  /** Общата част между „изчисли" и „създай": откъде, докъде, пакети, услуга, платец, услуги. */
  private buildRouteAndServices(
    settings: PigeonSettings,
    params: PigeonShipmentParams,
  ) {
    const pickup: Record<string, unknown> = {
      pickup_type: settings.pickupType,
    };
    if (settings.pickupType === 'address') {
      if (settings.senderAddressId)
        pickup.sender_address_id = settings.senderAddressId;
    } else if (settings.pickupOfficeId) {
      pickup.pickup_office_id = settings.pickupOfficeId;
    }

    const delivery: Record<string, unknown> = {
      delivery_type: params.deliveryKind,
    };
    if (params.deliveryKind === 'address') {
      if (params.deliveryAddress)
        delivery.delivery_address = this.buildAddress(params.deliveryAddress);
    } else if (params.deliveryOfficeId) {
      delivery.delivery_office_id = params.deliveryOfficeId;
    }

    // service_codes е ОБЕКТ (не масив): true за отметки, число за суми
    const serviceCodes: Record<string, boolean | number> = {};
    if (params.codAmount && params.codAmount > 0)
      serviceCodes[PIGEON_SERVICE.cod] = round2(params.codAmount);
    if (params.declaredValueAmount && params.declaredValueAmount > 0) {
      serviceCodes[PIGEON_SERVICE.declaredValue] = round2(
        params.declaredValueAmount,
      );
    }
    if (settings.smsNotification)
      serviceCodes[PIGEON_SERVICE.smsReceiver] = true;

    return {
      ...pickup,
      ...delivery,
      packages: params.packages.map((p) => ({
        weight: p.weight,
        ...(p.length ? { length: p.length } : {}),
        ...(p.width ? { width: p.width } : {}),
        ...(p.height ? { height: p.height } : {}),
        ...(p.description ? { description: p.description.slice(0, 500) } : {}),
      })),
      service_type: settings.serviceType,
      who_pays: settings.whoPays,
      ...(Object.keys(serviceCodes).length
        ? { service_codes: serviceCodes }
        : {}),
    };
  }

  buildCalculateBody(settings: PigeonSettings, params: PigeonShipmentParams) {
    // Изчислението ползва само city_id/street_id/street_number/postal_code от адреса
    return this.buildRouteAndServices(settings, params);
  }

  buildShipmentBody(settings: PigeonSettings, params: PigeonShipmentParams) {
    return {
      receiver_name: params.receiverName,
      receiver_phone: params.receiverPhone,
      ...(params.receiverEmail ? { receiver_email: params.receiverEmail } : {}),
      ...this.buildRouteAndServices(settings, params),
      ...(params.inventoryItems?.length
        ? {
            inventory_items: params.inventoryItems.map((it) => ({
              description: it.description.slice(0, 255),
              quantity: it.quantity,
              ...(it.unitPrice != null
                ? { unit_price: round2(it.unitPrice) }
                : {}),
              ...(it.unitWeight != null ? { unit_weight: it.unitWeight } : {}),
            })),
          }
        : {}),
      return_at_my_expense: settings.returnAtMyExpense,
      ...(params.note ? { note: params.note.slice(0, 500) } : {}),
      // Нашият номер на продажбата се връща в проследяването и в изплатените НП
      external_reference: params.orderNumber,
    };
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
