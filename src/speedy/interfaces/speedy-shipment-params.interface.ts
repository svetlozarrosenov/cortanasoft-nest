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
  packageType?: string;
  codAmount?: number;
  currency?: string;
}
