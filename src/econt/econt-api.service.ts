import { Injectable, Logger } from '@nestjs/common';
import { EcontCredentials, CreateLabelParams, EcontSettings } from './interfaces';

/**
 * Еконт влага грешките на няколко нива (innerErrors → innerErrors), често
 * с празно съобщение на горното ниво. Събираме всички непразни съобщения.
 */
export function collectEcontErrors(err: unknown): string {
  const out: string[] = [];
  const walk = (e: any) => {
    if (!e || typeof e !== 'object') return;
    const m = typeof e.message === 'string' ? e.message.trim() : '';
    if (m && !out.includes(m)) out.push(m);
    for (const inner of Array.isArray(e.innerErrors) ? e.innerErrors : []) {
      walk(inner);
    }
  };
  walk(err);
  return out.join('; ');
}

const ECONT_BASE = {
  test: 'https://demo.econt.com/ee/services',
  live: 'https://ee.econt.com/services',
};

/**
 * Pure HTTP клиент към Econt API. Не знае за Prisma, не зависи от DB.
 * Само прави заявки и парсва отговори.
 */
@Injectable()
export class EcontApiService {
  private readonly logger = new Logger(EcontApiService.name);

  async fetch(
    creds: EcontCredentials,
    path: string,
    body: Record<string, unknown> = {},
  ) {
    const baseUrl = ECONT_BASE[creds.mode];
    const res = await fetch(`${baseUrl}/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:
          'Basic ' +
          Buffer.from(`${creds.username}:${creds.password}`).toString(
            'base64',
          ),
      },
      body: JSON.stringify(body),
    });
    // Еконт връща HTML (не JSON) при грешен път или паднал сервиз —
    // res.json() тогава хвърля „Unexpected end of JSON input", което не
    // казва нищо на оператора.
    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      this.logger.error(
        `Econt API non-JSON response [${creds.mode}] ${path} (HTTP ${res.status}): ${text.slice(0, 300)}`,
      );
      throw new Error(`Еконт върна неочакван отговор (HTTP ${res.status})`);
    }
    if (!res.ok || data?.type === 'ExInvalidParam') {
      const errMsg = collectEcontErrors(data) || JSON.stringify(data);
      // Пълният отговор + какво сме пратили (без credentials) — грешките на
      // Еконт често са заровени дълбоко в innerErrors и краткото съобщение
      // не стига за дебъг.
      this.logger.error(
        `Econt API error [${creds.mode}] ${path} (HTTP ${res.status}): ${errMsg}\n` +
          `→ request body: ${JSON.stringify(body)}\n` +
          `→ full response: ${JSON.stringify(data)}`,
      );
      throw new Error(errMsg);
    }
    return data;
  }

  async testConnection(creds: EcontCredentials) {
    const result = await this.fetch(
      creds,
      'Profile/ProfileService.getClientProfiles.json',
    );
    return { success: true, profiles: result.profiles || [] };
  }

  // Офисите са обща номенклатура (~600 записа) — кешираме по среда за 6 часа,
  // за да не ги теглим при всяко създаване/обновяване на пратка.
  private officesCache = new Map<string, { at: number; offices: any[] }>();

  async getOffices(creds: EcontCredentials, countryCode = 'BGR') {
    const key = `${creds.mode}:${countryCode}`;
    const cached = this.officesCache.get(key);
    if (cached && Date.now() - cached.at < 6 * 60 * 60 * 1000) {
      return cached.offices;
    }
    const result = await this.fetch(
      creds,
      'Nomenclatures/NomenclaturesService.getOffices.json',
      { countryCode },
    );
    const offices: any[] = result.offices || [];
    this.officesCache.set(key, { at: Date.now(), offices });
    return offices;
  }

  /** „Град - Име на офис" по код, или null ако не е в номенклатурата. */
  async officeLabel(creds: EcontCredentials, code: string | null | undefined) {
    if (!code) return null;
    const offices = await this.getOffices(creds);
    const office = offices.find((o) => String(o?.code) === String(code));
    if (!office) return null;
    // Името на офиса при Еконт вече включва населеното място
    return office.name || null;
  }

  async getClientProfiles(creds: EcontCredentials) {
    const result = await this.fetch(
      creds,
      'Profile/ProfileService.getClientProfiles.json',
    );
    return result.profiles || [];
  }

  async calculateShipping(
    creds: EcontCredentials,
    settings: EcontSettings,
    params: CreateLabelParams,
  ) {
    const label = this.buildLabel(creds, settings, params);
    const result = await this.fetch(
      creds,
      'Shipments/LabelService.createLabel.json',
      { label, mode: 'calculate' },
    );
    return {
      totalPrice: result.label?.totalPrice || 0,
      label: result.label,
    };
  }

  async createLabel(
    creds: EcontCredentials,
    settings: EcontSettings,
    params: CreateLabelParams,
  ) {
    const label = this.buildLabel(creds, settings, params);
    this.logger.log(
      `Econt createLabel [${creds.mode}] order=${params.orderNumber} ` +
        `type=${label.shipmentType} weight=${label.weight} office=${label.receiverOfficeCode || '-'}`,
    );
    const result = await this.fetch(
      creds,
      'Shipments/LabelService.createLabel.json',
      { label, mode: 'create' },
    );
    this.logger.log(
      `Econt createLabel OK: shipment=${result.label?.shipmentNumber || 'N/A'} price=${result.label?.totalPrice ?? 'N/A'}`,
    );
    return {
      shipmentNumber: result.label?.shipmentNumber || null,
      totalPrice: result.label?.totalPrice || null,
      pdfURL: result.label?.pdfURL || null,
      expectedDeliveryDate: result.label?.expectedDeliveryDate || null,
      senderDueAmount: result.label?.senderDueAmount || 0,
      receiverDueAmount: result.label?.receiverDueAmount || 0,
      label: result.label,
    };
  }

  /**
   * Статуси на много пратки наведнъж (ShipmentService.getShipmentStatuses).
   * Отговорът е списък { status: ShipmentStatus | null, error: Error | null }
   * в реда на заявката; ненамерена пратка идва като error В елемента (HTTP 200).
   * Връща по номер на пратка.
   */
  async getShipmentStatuses(
    creds: EcontCredentials,
    shipmentNumbers: string[],
  ): Promise<Map<string, { status: any | null; error: string | null }>> {
    const out = new Map<string, { status: any | null; error: string | null }>();
    if (shipmentNumbers.length === 0) return out;
    const result = await this.fetch(
      creds,
      'Shipments/ShipmentService.getShipmentStatuses.json',
      { shipmentNumbers },
    );
    const entries: any[] = Array.isArray(result?.shipmentStatuses)
      ? result.shipmentStatuses
      : [];
    entries.forEach((entry, i) => {
      const number = entry?.status?.shipmentNumber || shipmentNumbers[i];
      if (!number) return;
      out.set(String(number), {
        status: entry?.status ?? null,
        error: entry?.error ? collectEcontErrors(entry.error) || 'Еконт не върна статус' : null,
      });
    });
    return out;
  }

  /**
   * Изтрива етикет в Еконт (LabelService.deleteLabels). Възможно е само
   * докато пратката не е предадена на куриера; след това Еконт връща грешка.
   */
  async deleteLabel(creds: EcontCredentials, shipmentNumber: string) {
    const result = await this.fetch(
      creds,
      'Shipments/LabelService.deleteLabels.json',
      { shipmentNumbers: [shipmentNumber] },
    );
    const entry = result?.results?.[0];
    if (entry?.error) {
      throw new Error(
        collectEcontErrors(entry.error) || 'Еконт отказа изтриването',
      );
    }
    this.logger.log(`Econt deleteLabel OK: shipment=${shipmentNumber}`);
  }

  private buildLabel(
    creds: EcontCredentials,
    sm: EcontSettings,
    params: CreateLabelParams,
  ): Record<string, any> {
    // Тарифни корекции — държат се 1:1 със shop/src/lib/econt.ts (и
    // /api/econt/public там), за да съвпада котираната на клиента в
    // магазина цена с товарителницата, създадена оттук. При промяна
    // синхронизирай и двете места!
    //
    // 1) pack → cargo auto-upgrade: PACK по спецификация на Еконт е до
    //    50кг / 61×44×37см; по-голяма пратка Еконт мълчаливо префактурира
    //    като cargo, така че котировка с 'pack' лъже. Не се downgrade-ва —
    //    изричен избор на pallet/cargo се уважава. API-то иска lowercase;
    //    нормализираме legacy главни букви ('PACK').
    const adminType = (sm.shipmentType || 'pack').toLowerCase();
    const totalWeight = Number(params.weight) || 0;
    const maxParcelDim = Math.max(
      Number(params.dimensionsL) || 0,
      Number(params.dimensionsW) || 0,
      Number(params.dimensionsH) || 0,
    );
    const exceedsPack = totalWeight > 50 || maxParcelDim > 60;
    const shipmentType =
      adminType === 'pack' && exceedsPack ? 'cargo' : adminType;

    // 2) Обемно тегло за cargo: Еконт отказва "weight below minimum",
    //    когато декларираното тегло е под обемното (L*W*H/5000). Pad-ваме
    //    предварително — ценово неутрално, Еконт така или иначе таксува
    //    по-голямата стойност.
    let effectiveWeight = Number(params.weight) || 1;
    if (shipmentType === 'cargo') {
      const L = Number(params.dimensionsL) || 0;
      const W = Number(params.dimensionsW) || 0;
      const H = Number(params.dimensionsH) || 0;
      if (L > 0 && W > 0 && H > 0) {
        const volumetricKg = (L * W * H) / 5000;
        if (volumetricKg > effectiveWeight) {
          effectiveWeight = Math.ceil(volumetricKg * 100) / 100;
        }
      }
    }

    const label: Record<string, any> = {
      orderNumber: params.orderNumber,
      senderOfficeCode: sm.senderOfficeCode || '',
      senderClient: {
        name: sm.senderName || 'Sender',
        phones: [sm.senderPhone || '0000000000'],
      },
      // Упълномощено лице (ShippingLabel.senderAgent, "Authorized sender"):
      // физическото лице, което предава пратката от името на фирмата.
      // Задължително при подател юридическо лице — иначе Еконт отказва:
      // „За юридическо лице, задължително се попълва упълномощено лице."
      // (В JSON API-то няма 'face' поле — упълномощаването е отделен
      // ClientProfile обект: https://ee.econt.com/services/Shipments/)
      ...(sm.senderFace && {
        senderAgent: {
          name: sm.senderFace,
          phones: [sm.senderPhone || '0000000000'],
        },
      }),
      receiverClient: {
        name: params.receiverName,
        phones: [params.receiverPhone],
      },
      packCount: params.packCount || 1,
      shipmentType,
      weight: effectiveWeight,
      shipmentDescription:
        params.description || `Поръчка ${params.orderNumber}`,
    };

    // 3) sizeUnder60cm (по-евтина тарифа при всички страни <60см): от
    //    реалните размери, когато ги знаем — голяма пратка с лъжлив флаг
    //    бива отказана от Еконт. Без размери — от админ дефолта.
    if (maxParcelDim > 0) {
      if (maxParcelDim < 60) label.sizeUnder60cm = true;
    } else if (sm.sizeUnder60cm) {
      label.sizeUnder60cm = true;
    }
    if (sm.keepUpright) label.keepUpright = true;
    if (sm.payAfterAccept) label.payAfterAccept = true;
    if (sm.payAfterTest) label.payAfterTest = true;
    if (sm.partialDelivery) label.partialDelivery = true;
    // emailOnDelivery в API-то на Еконт е низ с имейл адрес на получателя,
    // не флаг — без имейл на получателя няма какво да се прати.

    if (params.dimensionsL) label.shipmentDimensionsL = params.dimensionsL;
    if (params.dimensionsW) label.shipmentDimensionsW = params.dimensionsW;
    if (params.dimensionsH) label.shipmentDimensionsH = params.dimensionsH;

    if (params.receiverOfficeCode) {
      label.receiverOfficeCode = params.receiverOfficeCode;
    } else if (params.receiverAddress) {
      label.receiverAddress = params.receiverAddress;
    }

    if (sm.paymentBy === 'receiver') {
      label.paymentReceiverMethod = 'cash';
    } else {
      // 'credit' (плащане по договор) изисква КЛИЕНТСКИ НОМЕР при Еконт —
      // клиенти без такъв получават „Посочили сте грешен клиентски номер за
      // платец подател". Затова credit е изричен избор ('sender_credit'), а
      // не автоматика за live режим; дефолтът за подател е 'cash'.
      label.paymentSenderMethod =
        sm.paymentBy === 'sender_credit' && creds.mode === 'live'
          ? 'credit'
          : 'cash';
      if (sm.paymentShareAmount && sm.paymentShareAmount > 0) {
        label.paymentReceiverAmount = sm.paymentShareAmount;
        label.paymentReceiverAmountIsPercent = sm.paymentSharePercent || false;
        label.paymentReceiverMethod = 'cash';
      }
    }

    const services: Record<string, any> = {};

    if (params.codAmount && params.codAmount > 0 && sm.codEnabled) {
      services.cdAmount = params.codAmount;
      services.cdType = 'get';
      services.cdCurrency = params.currency || 'BGN';
      // При споразумение за НП (CD номер) се праща САМО номерът — то вече
      // дефинира как търговецът получава парите. Пращането на cdPayOptions
      // отгоре кара Еконт да валидира опциите като нови (иска клиент с име,
      // телефон, населено място) и връща: „Условия за изплащане на наложен
      // платеж: Невалиден параметър / Името на клиента не може да бъде
      // празно / Необходим е телефон...". cdPayOptions е само за търговци
      // БЕЗ споразумение.
      if (sm.cdAgreementNum) {
        // Споразумението за изплащане (CD…) се подава като cdPayOptionsTemplate
        // (така е в API-то на Еконт). Старото cdAgreementNum не съществува там:
        // Еконт го игнорираше и таксуваше НП като изплащане в брой — двойна
        // такса (86.86 вместо 43.43 за 2800 €, проверено 2026-11-07).
        services.cdPayOptionsTemplate = sm.cdAgreementNum;
      } else if (sm.cdPayMethod === 'bank' && sm.cdIban) {
        services.cdPayOptions = {
          method: 'bank',
          IBAN: sm.cdIban,
          BIC: sm.cdBic || '',
        };
      } else if (sm.cdPayMethod === 'office') {
        services.cdPayOptions = { method: 'office' };
      } else if (sm.cdPayMethod === 'door') {
        services.cdPayOptions = { method: 'door' };
      }
    }

    // Обявена стойност: изрична сума за пратката (дефолт = стойността на
    // стоката от модала), иначе сумата за НП, както беше досега
    const declared = params.declaredValueAmount ?? params.codAmount;
    if (sm.declaredValueEnabled && declared && declared > 0) {
      services.declaredValueAmount = declared;
      services.declaredValueCurrency = params.currency || 'BGN';
    }

    if (sm.smsNotification) services.smsNotification = true;
    if (sm.deliveryReceipt) services.deliveryReceipt = true;

    // Споразумение „по департамент" изисква данни за фактура или опис —
    // пращаме цифров опис на стоките и номера на фактурата, когато има.
    if (params.packingList && params.packingList.length > 0) {
      label.packingListType = 'digital';
      label.packingList = params.packingList.map((it, i) => ({
        // Еконт отказва ред без инвентарен номер: артикулният номер на
        // продукта, а без такъв — поредният номер на реда
        inventoryNum: it.inventoryNum || String(i + 1),
        description: it.description,
        count: it.count,
        ...(it.price != null ? { price: it.price } : {}),
        ...(it.weight != null ? { weight: it.weight } : {}),
      }));
    }
    if (params.invoiceNum) services.invoiceNum = params.invoiceNum;

    if (Object.keys(services).length > 0) {
      label.services = services;
    }

    // Типовете инструкции по API-то са take / give / return / services.
    // 'give' = при предаване на получателя (бившият ни 'DELIVERY', който
    // Еконт отказваше с „Невалиден тип инструкция").
    const instructions: Record<string, any>[] = [];
    if (sm.instructionsDefault) {
      instructions.push({
        type: 'give',
        title: 'Инструкция при доставка',
        description: sm.instructionsDefault,
      });
    }
    if (sm.returnDaysUntilReturn || sm.returnFailAction) {
      // Параметрите живеят в returnInstructionParams; rejectAction приема
      // contact / instruction / return_to_sender / return_to_office /
      // return_to_address. „destroy" няма аналог → инструкция в текст.
      const params: Record<string, any> = {};
      if (sm.returnDaysUntilReturn) {
        params.daysUntilReturn = sm.returnDaysUntilReturn;
      }
      if (sm.returnFailAction === 'return') {
        params.rejectAction = 'return_to_sender';
        params.returnParcelDestination = 'sender';
      } else if (sm.returnFailAction === 'destroy') {
        params.rejectAction = 'instruction';
        params.rejectInstruction = 'При отказ пратката да се унищожи.';
      }
      instructions.push({
        type: 'return',
        title: 'Връщане',
        description: 'Инструкция за връщане при неуспешна доставка',
        returnInstructionParams: params,
      });
    }
    if (instructions.length > 0) {
      label.instructions = instructions;
    }

    return label;
  }
}
