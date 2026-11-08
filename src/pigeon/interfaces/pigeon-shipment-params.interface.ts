/** Адрес на Pigeon: градът и улицата са по id от номенклатурите им. */
export interface PigeonAddressParams {
  cityId: number;
  streetId?: number;
  streetNumber?: string;
  buildingNumber?: string;
  entrance?: string;
  floor?: string;
  apartment?: string;
  postalCode?: string;
  // Без улица от номенклатурата Pigeon иска свободен текст (мин. 3 знака)
  additionalInfo?: string;
  neighborhood?: string;
}

export interface PigeonPackageParams {
  weight: number;
  length?: number;
  width?: number;
  height?: number;
  description?: string;
}

/** Опис на стоките (inventory_items); иска се при частично приемане. */
export interface PigeonInventoryItemParams {
  description: string;
  quantity: number;
  unitPrice?: number;
  unitWeight?: number;
}

export interface PigeonShipmentParams {
  orderNumber: string;
  receiverName: string;
  receiverPhone: string;
  receiverEmail?: string;
  deliveryKind: 'address' | 'office' | 'locker';
  deliveryOfficeId?: number;
  deliveryAddress?: PigeonAddressParams;
  packages: PigeonPackageParams[];
  inventoryItems?: PigeonInventoryItemParams[];
  codAmount?: number;
  declaredValueAmount?: number;
  note?: string;
}
