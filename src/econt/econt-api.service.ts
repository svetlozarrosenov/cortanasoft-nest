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
    const result = await this.fetch(
      creds,
      'Shipments/LabelService.createLabel.json',
      { label, mode: 'create' },
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
    const label: Record<string, any> = {
      orderNumber: params.orderNumber,
      senderOfficeCode: sm.senderOfficeCode || '',
      senderClient: {
        name: sm.senderName || 'Sender',
        phones: [sm.senderPhone || '0000000000'],
      },
      receiverClient: {
        name: params.receiverName,
        phones: [params.receiverPhone],
      },
      packCount: params.packCount || 1,
      shipmentType: sm.shipmentType || 'PACK',
      weight: params.weight || 1,
      shipmentDescription:
        params.description || `Поръчка ${params.orderNumber}`,
    };

    if (sm.sizeUnder60cm) label.sizeUnder60cm = '1';
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
      label.paymentSenderMethod =
        creds.mode === 'live' ? 'credit' : 'cash';
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
      if (sm.cdAgreementNum) {
        services.cdAgreementNum = sm.cdAgreementNum;
      }
      if (sm.cdPayMethod === 'bank' && sm.cdIban) {
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
