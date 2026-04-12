import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsIn,
  Min,
  IsInt,
} from 'class-validator';

export class UpdateEcontConfigDto {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

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

  // Подател
  @IsString()
  @IsOptional()
  senderName?: string;

  @IsString()
  @IsOptional()
  senderPhone?: string;

  @IsString()
  @IsOptional()
  senderCountryId?: string;

  @IsString()
  @IsOptional()
  senderOfficeCode?: string;

  // Пратка
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

  // Услуги
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

  // Връщане
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

  // Споделяне на плащане
  @IsNumber()
  @IsOptional()
  @Min(0)
  paymentShareAmount?: number;

  @IsBoolean()
  @IsOptional()
  paymentSharePercent?: boolean;
}
