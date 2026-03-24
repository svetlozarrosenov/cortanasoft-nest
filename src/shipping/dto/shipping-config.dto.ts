import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsIn,
  Min,
  IsInt,
} from 'class-validator';

export class UpdateShippingConfigDto {
  @IsString()
  @IsOptional()
  @IsIn(['econt'])
  provider?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  // Credentials
  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  @IsIn(['test', 'live'])
  mode?: string;

  // Sender
  @IsString()
  @IsOptional()
  senderName?: string;

  @IsString()
  @IsOptional()
  senderPhone?: string;

  @IsString()
  @IsOptional()
  senderOfficeCode?: string;

  // Shipment
  @IsString()
  @IsOptional()
  shipmentType?: string;

  @IsString()
  @IsOptional()
  @IsIn(['sender', 'receiver'])
  paymentBy?: string;

  // COD
  @IsBoolean()
  @IsOptional()
  codEnabled?: boolean;

  @IsString()
  @IsOptional()
  cdAgreementNum?: string;

  @IsString()
  @IsOptional()
  @IsIn(['bank', 'office', 'door'])
  cdPayMethod?: string;

  @IsString()
  @IsOptional()
  cdIban?: string;

  @IsString()
  @IsOptional()
  cdBic?: string;

  // Services
  @IsBoolean()
  @IsOptional()
  smsNotification?: boolean;

  @IsBoolean()
  @IsOptional()
  deliveryReceipt?: boolean;

  @IsBoolean()
  @IsOptional()
  declaredValueEnabled?: boolean;

  // Handling
  @IsBoolean()
  @IsOptional()
  sizeUnder60cm?: boolean;

  @IsBoolean()
  @IsOptional()
  keepUpright?: boolean;

  @IsBoolean()
  @IsOptional()
  payAfterAccept?: boolean;

  @IsBoolean()
  @IsOptional()
  payAfterTest?: boolean;

  @IsBoolean()
  @IsOptional()
  partialDelivery?: boolean;

  @IsBoolean()
  @IsOptional()
  emailOnDelivery?: boolean;

  // Return
  @IsInt()
  @IsOptional()
  @Min(1)
  returnDaysUntilReturn?: number;

  @IsString()
  @IsOptional()
  returnFailAction?: string;

  @IsString()
  @IsOptional()
  instructionsDefault?: string;

  // Payment sharing
  @IsNumber()
  @IsOptional()
  @Min(0)
  paymentShareAmount?: number;

  @IsBoolean()
  @IsOptional()
  paymentSharePercent?: boolean;
}
