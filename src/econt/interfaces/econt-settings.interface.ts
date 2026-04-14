export interface EcontSettings {
  senderName?: string;
  senderPhone?: string;
  senderOfficeCode?: string;
  shipmentType?: string;
  paymentBy?: string;
  codEnabled?: boolean;
  cdAgreementNum?: string;
  cdPayMethod?: string;
  cdIban?: string;
  cdBic?: string;
  smsNotification?: boolean;
  deliveryReceipt?: boolean;
  declaredValueEnabled?: boolean;
  sizeUnder60cm?: boolean;
  keepUpright?: boolean;
  payAfterAccept?: boolean;
  payAfterTest?: boolean;
  partialDelivery?: boolean;
  emailOnDelivery?: boolean;
  returnDaysUntilReturn?: number;
  returnFailAction?: string;
  instructionsDefault?: string;
  paymentShareAmount?: number;
  paymentSharePercent?: boolean;
}
