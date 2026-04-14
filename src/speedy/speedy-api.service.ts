/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';
import {
  SpeedyCredentials,
  SpeedySettings,
  SpeedyCountry,
  SpeedyShipmentParams,
} from './interfaces';

const SPEEDY_BASE = 'https://api.speedy.bg/v1';

/**
 * Pure HTTP клиент към Speedy API. Не знае за Prisma.
 */
@Injectable()
export class SpeedyApiService {
  private readonly logger = new Logger(SpeedyApiService.name);

  private async fetch<T = Record<string, any>>(
    creds: SpeedyCredentials,
    path: string,
    body: Record<string, unknown> = {},
  ): Promise<T> {
    const payload = {
      userName: creds.username,
      password: creds.password,
      ...body,
    };

    const url = `${SPEEDY_BASE}${path}`;
    const bodyJson = JSON.stringify(payload);
    this.logger.debug(`→ POST ${url}`);
    this.logger.debug(
      `→ Body: ${bodyJson.replace(/"password":"[^"]*"/, '"password":"***"')}`,
    );

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: bodyJson,
    });

    const data: Record<string, any> = await res.json();
    this.logger.debug(`← ${res.status} ${JSON.stringify(data).slice(0, 1000)}`);

    if (data && data.error) {
      const errMsg =
        (data.error as { message?: string })?.message ||
        JSON.stringify(data.error);
      throw new Error(errMsg);
    }
    return data as T;
  }

  async testConnection(creds: SpeedyCredentials) {
    const result = await this.fetch(creds, '/client');
    return { success: true, clientId: result.clientId };
  }

  async getClientInfo(creds: SpeedyCredentials) {
    return this.fetch(creds, '/client');
  }

  async getContractClients(creds: SpeedyCredentials) {
    const result = await this.fetch(creds, '/client/contract');
    return result.clients || [];
  }

  async getServices(creds: SpeedyCredentials) {
    const result = await this.fetch(creds, '/services');
    return result.services || [];
  }

  async getDestinationServices(
    creds: SpeedyCredentials,
    recipientSiteId: number,
    recipientCountryId = 100,
  ) {
    const result = await this.fetch(creds, '/services/destination', {
      recipient: { countryId: recipientCountryId, siteId: recipientSiteId },
    });
    return result.services || [];
  }

  async findOffices(
    creds: SpeedyCredentials,
    opts: { countryId?: number; siteId?: number; name?: string } = {},
  ) {
    const result = await this.fetch(creds, '/location/office', {
      countryId: opts.countryId ?? 100,
      siteId: opts.siteId,
      name: opts.name,
    });
    return result.offices || [];
  }

  /**
   * /location/state/csv/{countryId} — връща ВСИЧКИ states (области) за дадена държава като CSV.
   * Resultaт се parse-ва в array от обекти.
   * https://api.speedy.bg/api/docs/#href-get-all-states-req
   */
  /**
   * /location/country/csv — връща ВСИЧКИ държави като CSV.
   * https://api.speedy.bg/api/docs/#href-get-all-countries-req
   */
  async getAllCountries(creds: SpeedyCredentials): Promise<SpeedyCountry[]> {
    const url = `${SPEEDY_BASE}/location/country/csv`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        userName: creds.username,
        password: creds.password,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `Speedy /location/country/csv error: ${res.status} ${text.slice(0, 200)}`,
      );
    }

    const csv = await res.text();
    return this.parseCountriesCsv(csv);
  }

  private parseCountriesCsv(csv: string): SpeedyCountry[] {
    const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];

    const dataLines = lines.slice(1); // skip header
    const countries: SpeedyCountry[] = [];

    for (const line of dataLines) {
      const cols = this.parseCsvLine(line);
      if (cols.length >= 15) {
        countries.push({
          id: cols[0],
          name: cols[1],
          nameEn: cols[2],
          isoAlpha2: cols[3],
          isoAlpha3: cols[4],
          postCodeFormats: cols[5],
          requireState: cols[6],
          addressType: cols[7],
          currencyCode: cols[8],
          defaultOfficeId: cols[9],
          streetTypes: cols[10],
          streetTypesEn: cols[11],
          complexTypes: cols[12],
          complexTypesEn: cols[13],
          siteNomen: cols[14],
        });
      }
    }

    return countries;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result.map((s) => s.trim());
  }

  /**
   * /location/site — търсене на населени места
   * countryId е REQUIRED според документацията.
   * https://api.speedy.bg/api/docs/#href-find-site-req
   */
  /**
   * /location/site/{id} — взима един site по ID.
   * https://api.speedy.bg/api/docs/#href-get-site-req
   */
  async getSiteById(creds: SpeedyCredentials, siteId: number) {
    const result = await this.fetch(creds, `/location/site/${siteId}`);
    return result.site || null;
  }

  /**
   * /location/office/{id} — взима един office по ID.
   */
  async getOfficeById(creds: SpeedyCredentials, officeId: number) {
    const result = await this.fetch(creds, `/location/office/${officeId}`);
    return result.office || null;
  }

  async findSites(
    creds: SpeedyCredentials,
    opts: {
      countryId?: number;
      name?: string;
      postCode?: string;
      type?: string;
      municipality?: string;
      region?: string;
    } = {},
  ) {
    const body: Record<string, unknown> = {
      countryId: opts.countryId ?? 100, // 100 = България
    };
    if (opts.name) body.name = opts.name;
    if (opts.postCode) body.postCode = opts.postCode;
    if (opts.type) body.type = opts.type;
    if (opts.municipality) body.municipality = opts.municipality;
    if (opts.region) body.region = opts.region;

    this.logger.log(`findSites body: ${JSON.stringify(body)}`);
    const result = await this.fetch(creds, '/location/site', body);
    this.logger.log(
      `findSites result: ${JSON.stringify(result).slice(0, 500)}`,
    );
    return result.sites || [];
  }

  async findStreets(creds: SpeedyCredentials, siteId: number, name?: string) {
    const result = await this.fetch(creds, '/location/street', {
      siteId,
      name,
    });
    return result.streets || [];
  }

  async calculateShipping(
    creds: SpeedyCredentials,
    settings: SpeedySettings,
    params: SpeedyShipmentParams,
  ) {
    const body = this.buildCalculationBody(settings, params);
    this.logger.log(`Speedy calculate body: ${JSON.stringify(body)}`);
    const result = await this.fetch(creds, '/calculate', body);
    const calc = result.calculations?.[0];

    // Speedy връща 200 OK, но грешката е вътре в calculations[0].error
    if (calc?.error) {
      throw new Error(calc.error.message || JSON.stringify(calc.error));
    }

    return {
      serviceId: calc?.serviceId,
      totalPrice: calc?.price?.total || 0,
      currencyCode: calc?.price?.currency || 'BGN',
      estimatedDeliveryDate: calc?.deliveryDeadline || null,
      price: calc?.price || null,
    };
  }

  async createShipment(
    creds: SpeedyCredentials,
    settings: SpeedySettings,
    params: SpeedyShipmentParams,
  ) {
    const body = this.buildShipmentBody(settings, params);
    const result = await this.fetch(creds, '/shipment', body);
    return {
      shipmentId: result.id || null,
      parcels: result.parcels || [],
      price: result.price || null,
      pickupDate: result.pickupDate || null,
      deliveryDeadline: result.deliveryDeadline || null,
      total: result.price?.total || null,
      currency: result.price?.currency || 'BGN',
    };
  }

  async cancelShipment(
    creds: SpeedyCredentials,
    shipmentId: string,
    comment = 'Cancelled from CortanaSoft',
  ) {
    return this.fetch(creds, '/shipment/cancel', { shipmentId, comment });
  }

  async trackParcels(creds: SpeedyCredentials, parcelIds: string[]) {
    const parcels = parcelIds.map((id) => ({ id }));
    const result = await this.fetch(creds, '/track', { parcels });
    return result.parcels || [];
  }

  async printLabels(
    creds: SpeedyCredentials,
    parcelIds: string[],
    paperSize: 'A4' | 'A6' | 'A4_4xA6' = 'A6',
  ) {
    const result = await this.fetch(creds, '/print', {
      paperSize,
      parcels: parcelIds.map((id) => ({ parcel: { id } })),
      additionalWaybillSenderCopy: 'NONE',
    });
    return {
      data: result.data || null,
      labelInfo: result.printLabelsInfo || [],
    };
  }

  async getShipmentInfo(creds: SpeedyCredentials, shipmentIds: string[]) {
    const result = await this.fetch(creds, '/shipment/info', { shipmentIds });
    return result.shipments || [];
  }

  // ==================== Build request bodies ====================

  /**
   * Builds the `recipient` object per Speedy API spec.
   * - Office pickup: `address.officeId`
   * - Address delivery: `address.streetId/streetNo/siteId`
   * - Phone goes in `phone1.number`, NOT `phoneNumber.number`
   * - Client name is sent through `address.addressText` or in a separate `contactName` field if available
   */
  private buildRecipient(
    _settings: SpeedySettings,
    params: SpeedyShipmentParams,
  ): Record<string, any> {
    const address: Record<string, any> = {
      countryId: params.receiverAddress?.countryId || 100,
    };

    if (params.receiverOfficeId) {
      // Office pickup — pickupOfficeId на recipient ниво, НЕ в address
      return {
        pickupOfficeId: params.receiverOfficeId,
        phone1: { number: params.receiverPhone },
        clientName: params.receiverName,
        privatePerson: true,
      };
    }

    if (params.receiverAddress) {
      address.siteId = params.receiverAddress.siteId;
      if (params.receiverAddress.streetName) {
        address.addressText = [
          params.receiverAddress.streetName,
          params.receiverAddress.streetNumber,
          params.receiverAddress.blockNumber,
          params.receiverAddress.entranceNumber,
          params.receiverAddress.floorNumber,
          params.receiverAddress.apartmentNumber,
        ]
          .filter(Boolean)
          .join(' ');
      }
      if (params.receiverAddress.streetNumber) {
        address.streetNo = params.receiverAddress.streetNumber;
      }
      if (params.receiverAddress.postCode) {
        address.postCode = params.receiverAddress.postCode;
      }
    }

    return {
      address,
      phone1: { number: params.receiverPhone },
      clientName: params.receiverName,
      privatePerson: true,
    };
  }

  private buildAdditionalServices(
    settings: SpeedySettings,
    params: SpeedyShipmentParams,
  ): Record<string, any> | undefined {
    const services: Record<string, any> = {};

    if (params.codAmount && params.codAmount > 0 && settings.codEnabled) {
      services.cod = {
        amount: params.codAmount,
        currencyCode: params.currency || 'BGN',
        processingType: settings.codProcessingType || 'CASH',
      };
    }

    if (
      settings.declaredValueEnabled &&
      params.codAmount &&
      params.codAmount > 0
    ) {
      services.declaredValue = {
        amount: params.codAmount,
        currencyCode: params.currency || 'BGN',
      };
    }

    return Object.keys(services).length > 0 ? services : undefined;
  }

  /**
   * /calculate body — recipient е "destination" структура с countryId/siteId,
   * НЕ е същата като /shipment recipient. Изисква parcelsCount + totalWeight.
   * Документация: https://api.speedy.bg/api/docs/#href-calculate
   */
  /**
   * Per https://services.speedy.bg/api/#CalculationRequest
   *
   * Key differences from our old code:
   * - recipient.addressLocation.siteId (NOT recipient.siteId)
   * - service.serviceIds: [505] (array, NOT serviceId)
   * - payment.courierServicePayer (NOT payerType)
   * - sender.clientId for authenticated sender
   */
  private buildCalculationBody(
    settings: SpeedySettings,
    params: SpeedyShipmentParams,
  ): Record<string, any> {
    const recipient: Record<string, any> = {
      privatePerson: true,
    };

    if (params.receiverOfficeId) {
      recipient.pickupOfficeId = params.receiverOfficeId;
    } else if (params.receiverAddress) {
      recipient.addressLocation = {
        siteId: params.receiverAddress.siteId,
      };
    } else if (params.receiverSiteId) {
      recipient.addressLocation = {
        siteId: params.receiverSiteId,
      };
    }

    const body: Record<string, any> = {
      recipient,
      service: {
        autoAdjustPickupDate: true,
        serviceIds: [settings.serviceId || 505],
        additionalServices: this.buildAdditionalServices(settings, params),
      },
      content: {
        parcelsCount: params.parcelsCount || 1,
        totalWeight: params.weight,
      },
      payment: {
        courierServicePayer: settings.payerType || 'SENDER',
      },
    };

    // Sender
    if (settings.senderClientId) {
      body.sender = { clientId: settings.senderClientId };
      if (settings.senderOfficeId) {
        body.sender.dropoffOfficeId = settings.senderOfficeId;
      }
    }

    return body;
  }

  /**
   * /shipment body per official Speedy API spec:
   * https://api.speedy.bg/api/docs/#href-create-shipment-req
   *
   * Различия от /calculate:
   * - content.parcels (array), НЕ parcelsCount/totalWeight
   * - parcel.size = { height, width, depth }
   * - sender ползва phone1: { number }, НЕ phoneNumber
   * - service.pickupDate е препоръчителен
   */
  /**
   * /shipment body per official Speedy API spec:
   * https://services.speedy.bg/api/#CreateShipmentRequest
   *
   * Ключови разлики от /calculate:
   * - service.serviceId (единично), НЕ serviceIds (масив)
   * - content.parcels (масив с seqNo) + parcelsCount + totalWeight
   * - payment.courierServicePayer (НЕ payerType)
   * - recipient.pickupOfficeId за офис, recipient.address за адрес
   */
  private buildShipmentBody(
    settings: SpeedySettings,
    params: SpeedyShipmentParams,
  ): Record<string, any> {
    const recipient = this.buildRecipient(settings, params);

    const parcelsCount = params.parcelsCount || 1;
    const parcels: Record<string, any>[] = [];
    for (let i = 0; i < parcelsCount; i++) {
      const parcel: Record<string, any> = {
        seqNo: i + 1,
        weight: params.weight / parcelsCount,
      };
      const size: Record<string, number> = {};
      if (params.width) size.width = params.width;
      if (params.height) size.height = params.height;
      if (params.depth) size.depth = params.depth;
      if (Object.keys(size).length > 0) parcel.size = size;
      parcels.push(parcel);
    }

    const body: Record<string, any> = {
      recipient,
      service: {
        serviceId: settings.serviceId || 505,
        autoAdjustPickupDate: true,
        saturdayDelivery: settings.saturdayDelivery || false,
        additionalServices: this.buildAdditionalServices(settings, params),
      },
      content: {
        parcelsCount,
        totalWeight: params.weight,
        contents: params.description || undefined,
        package: params.packageType || 'BOX',
        parcels,
      },
      payment: {
        courierServicePayer: settings.payerType || 'SENDER',
      },
      ref1: params.orderNumber,
      shipmentNote: params.description || `Поръчка ${params.orderNumber}`,
    };

    // Sender
    if (settings.senderClientId || settings.senderPhone) {
      const sender: Record<string, any> = {};
      if (settings.senderClientId) {
        sender.clientId = settings.senderClientId;
      } else {
        sender.privatePerson = false;
      }
      if (settings.senderPhone) {
        sender.phone1 = { number: settings.senderPhone };
      }
      if (settings.senderName) {
        sender.contactName = settings.senderName;
      }
      if (settings.senderOfficeId) {
        sender.dropoffOfficeId = settings.senderOfficeId;
      }
      body.sender = sender;
    }

    return body;
  }
}
