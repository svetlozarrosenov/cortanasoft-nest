export interface SpeedySettings {
  senderClientId?: number;
  senderPhone?: string;
  senderName?: string;
  senderCountryId?: number;
  senderSiteId?: number;
  senderOfficeId?: number;
  serviceId?: number;
  payerType?: string;
  codEnabled?: boolean;
  codProcessingType?: string;
  declaredValueEnabled?: boolean;
  saturdayDelivery?: boolean;
  deferredDays?: number;
  returnShipmentServiceId?: number;
  returnInstructions?: string;
}
