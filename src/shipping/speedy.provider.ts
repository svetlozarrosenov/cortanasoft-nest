import { Injectable, Logger } from '@nestjs/common';

const SPEEDY_BASE = 'https://api.speedy.bg/v1';

export interface SpeedyCredentials {
  username: string;
  password: string;
}

export interface SpeedySettings {
  senderClientId?: number;
  senderPhone?: string;
  senderName?: string;
  senderCountryId?: number;
  senderSiteId?: number;
  senderOfficeId?: number;
  serviceId?: number;
  payerType?: string; // SENDER | RECIPIENT | THIRD_PARTY
  codEnabled?: boolean;
  codProcessingType?: string; // CASH | POSTAL_MONEY_TRANSFER
  declaredValueEnabled?: boolean;
  saturdayDelivery?: boolean;
  deferredDays?: number;
  returnShipmentServiceId?: number;
  returnInstructions?: string;
}

export interface SpeedyShipmentParams {
  orderNumber: string;
  receiverName: string;
  receiverPhone: string;
  receiverOfficeId?: number;
  receiverSiteId?: number;
  receiverAddress?: {
    countryId: number;
    siteId: number;
    streetName: string;
    streetNumber?: string;
    blockNumber?: string;
    entranceNumber?: string;
    floorNumber?: string;
    apartmentNumber?: string;
    postCode?: string;
  };
  parcelsCount: number;
  weight: number;
  width?: number;
  height?: number;
  depth?: number;
  description?: string;
  codAmount?: number;
  currency?: string;
}

@Injectable()
export class SpeedyProvider {
  private readonly logger = new Logger(SpeedyProvider.name);

  private async fetch(
    creds: SpeedyCredentials,
    path: string,
    body: Record<string, unknown> = {},
  ) {
    const payload = {
      userName: creds.username,
      password: creds.password,
      ...body,
    };

    const res = await fetch(`${SPEEDY_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (data.error) {
      const errMsg = data.error.message || JSON.stringify(data.error);
      throw new Error(errMsg);
    }
    return data;
  }

  async testConnection(creds: SpeedyCredentials) {
    const result = await this.fetch(creds, '/client');
    return { success: true, clientId: result.clientId };
  }

  async getClientInfo(creds: SpeedyCredentials) {
    const result = await this.fetch(creds, '/client');
    return result;
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
      recipient: {
        countryId: recipientCountryId,
        siteId: recipientSiteId,
      },
    });
    return result.services || [];
  }

  async findOffices(
    creds: SpeedyCredentials,
    opts: {
      countryId?: number;
      siteId?: number;
      name?: string;
    } = {},
  ) {
    const result = await this.fetch(creds, '/location/office', {
      countryId: opts.countryId ?? 100,
      siteId: opts.siteId,
      name: opts.name,
    });
    return result.offices || [];
  }

  async findSites(
    creds: SpeedyCredentials,
    opts: { countryId?: number; name?: string; postCode?: string } = {},
  ) {
    const result = await this.fetch(creds, '/location/site', {
      countryId: opts.countryId ?? 100,
      name: opts.name,
      postCode: opts.postCode,
    });
    return result.sites || [];
  }

  async findStreets(
    creds: SpeedyCredentials,
    siteId: number,
    name?: string,
  ) {
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
    const result = await this.fetch(creds, '/calculate', body);
    const calc = result.calculations?.[0];
    return {
      serviceId: calc?.serviceId,
      totalPrice: calc?.price?.totalPrice || 0,
      currencyCode: calc?.price?.currencyCode || 'BGN',
      estimatedDeliveryDate: calc?.estimatedDeliveryDate || null,
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
    };
  }

  async cancelShipment(
    creds: SpeedyCredentials,
    shipmentId: string,
    comment = 'Cancelled from CortanaSoft',
  ) {
    return this.fetch(creds, '/shipment/cancel', {
      shipmentId,
      comment,
    });
  }

  async trackParcels(creds: SpeedyCredentials, parcelIds: string[]) {
    const parcels = parcelIds.map((id) => ({ id }));
    const result = await this.fetch(creds, '/track', { parcels });
    return result.parcels || [];
  }

  async printLabels(
    creds: SpeedyCredentials,
    shipmentId: string,
    parcelId: string,
    paperSize: 'A4' | 'A6' | 'A4_4xA6' = 'A6',
  ) {
    const result = await this.fetch(creds, '/print/extended', {
      paperSize,
      parcels: [{ parcelId, shipmentId }],
    });
    return {
      data: result.data || null, // Base64 PDF
      labelInfo: result.printLabelsInfo || [],
    };
  }

  async getShipmentInfo(creds: SpeedyCredentials, shipmentIds: string[]) {
    const result = await this.fetch(creds, '/shipment/info', {
      shipmentIds,
    });
    return result.shipments || [];
  }

  // ==================== Build request bodies ====================

  private buildRecipient(
    settings: SpeedySettings,
    params: SpeedyShipmentParams,
  ): Record<string, any> {
    const recipient: Record<string, any> = {
      phoneNumber: { number: params.receiverPhone },
      clientName: params.receiverName,
      privatePerson: true,
    };

    if (params.receiverOfficeId) {
      recipient.pickupOfficeId = params.receiverOfficeId;
    } else if (params.receiverAddress) {
      recipient.address = {
        countryId: params.receiverAddress.countryId || 100,
        siteId: params.receiverAddress.siteId,
        streetName: params.receiverAddress.streetName,
        streetNo: params.receiverAddress.streetNumber,
        blockNo: params.receiverAddress.blockNumber,
        entranceNo: params.receiverAddress.entranceNumber,
        floorNo: params.receiverAddress.floorNumber,
        apartmentNo: params.receiverAddress.apartmentNumber,
        postCode: params.receiverAddress.postCode,
      };
    }

    return recipient;
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

  private buildCalculationBody(
    settings: SpeedySettings,
    params: SpeedyShipmentParams,
  ): Record<string, any> {
    const recipient: Record<string, any> = {
      countryId: 100,
    };

    if (params.receiverOfficeId) {
      recipient.siteId =
        params.receiverSiteId || settings.senderSiteId || 68134; // Sofia default
    } else if (params.receiverAddress) {
      recipient.siteId = params.receiverAddress.siteId;
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
        parcelsCount: params.parcelsCount || 1,
        totalWeight: params.weight,
      },
      payment: {
        payerType: settings.payerType || 'SENDER',
        paymentType: 'CASH',
      },
    };

    return body;
  }

  private buildShipmentBody(
    settings: SpeedySettings,
    params: SpeedyShipmentParams,
  ): Record<string, any> {
    const recipient = this.buildRecipient(settings, params);

    const parcels: Record<string, any>[] = [];
    for (let i = 0; i < (params.parcelsCount || 1); i++) {
      const parcel: Record<string, any> = {
        weight: params.weight / (params.parcelsCount || 1),
        size: {},
      };
      if (params.width) parcel.size.width = params.width;
      if (params.height) parcel.size.height = params.height;
      if (params.depth) parcel.size.depth = params.depth;
      if (Object.keys(parcel.size).length === 0) delete parcel.size;
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
        parcelsCount: params.parcelsCount || 1,
        parcelsList: parcels,
      },
      payment: {
        payerType: settings.payerType || 'SENDER',
        paymentType: 'CASH',
      },
      ref1: params.orderNumber,
      shipmentNote: params.description || `Поръчка ${params.orderNumber}`,
    };

    // Sender info
    if (settings.senderPhone) {
      body.sender = {
        phoneNumber: { number: settings.senderPhone },
        clientName: settings.senderName,
      };
      if (settings.senderClientId) {
        body.sender.clientId = settings.senderClientId;
      }
    }

    return body;
  }
}
