import { Injectable, Logger } from '@nestjs/common';
import { EcontCredentials, CreateLabelParams, EcontSettings } from './interfaces';

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
    const data = await res.json();
    if (!res.ok || data.type === 'ExInvalidParam') {
      const errMsg =
        data?.innerErrors?.[0]?.innerErrors?.[0]?.message ||
        data?.innerErrors?.[0]?.message ||
        data?.message ||
        JSON.stringify(data);
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

  async getOffices(creds: EcontCredentials, countryCode = 'BGR') {
    const result = await this.fetch(
      creds,
      'Nomenclatures/NomenclaturesService.getOffices.json',
      { countryCode },
    );
    return result.offices || [];
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

  async trackShipment(creds: EcontCredentials, shipmentNumber: string) {
    const result = await this.fetch(creds, 'Shipment/Status', {
      shipmentNumbers: [shipmentNumber],
    });
    return result?.shipmentStatuses?.[0] || null;
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
      if (maxParcelDim < 60) label.sizeUnder60cm = '1';
    } else if (sm.sizeUnder60cm) {
      label.sizeUnder60cm = '1';
    }
    if (sm.keepUpright) label.keepUpright = true;
    if (sm.payAfterAccept) label.payAfterAccept = true;
    if (sm.payAfterTest) label.payAfterTest = true;
    if (sm.partialDelivery) label.partialDelivery = true;
    if (sm.emailOnDelivery) label['e-mailOnDelivery'] = true;

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
        services.cdAgreementNum = sm.cdAgreementNum;
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

    if (
      sm.declaredValueEnabled &&
      params.codAmount &&
      params.codAmount > 0
    ) {
      services.declaredValueAmount = params.codAmount;
      services.declaredValueCurrency = params.currency || 'BGN';
    }

    if (sm.smsNotification) services.smsNotification = true;
    if (sm.deliveryReceipt) services.deliveryReceipt = true;

    if (Object.keys(services).length > 0) {
      label.services = services;
    }

    const instructions: Record<string, any>[] = [];
    if (sm.instructionsDefault) {
      instructions.push({
        type: 'DELIVERY',
        description: sm.instructionsDefault,
      });
    }
    if (sm.returnDaysUntilReturn || sm.returnFailAction) {
      const returnInstr: Record<string, any> = { type: 'return' };
      if (sm.returnDaysUntilReturn) {
        returnInstr.days_until_return = sm.returnDaysUntilReturn;
      }
      if (sm.returnFailAction) {
        returnInstr.delivery_fail_action = sm.returnFailAction;
      }
      instructions.push(returnInstr);
    }
    if (instructions.length > 0) {
      label.instructions = instructions;
    }

    return label;
  }
}
