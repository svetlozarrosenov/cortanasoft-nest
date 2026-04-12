import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsIn,
} from 'class-validator';

export class UpdateSpeedyConfigDto {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  password?: string;

  // Подател
  @IsString()
  @IsOptional()
  senderName?: string;

  @IsString()
  @IsOptional()
  senderPhone?: string;

  @IsInt()
  @IsOptional()
  senderCountryId?: number;

  @IsInt()
  @IsOptional()
  senderSiteId?: number;

  @IsInt()
  @IsOptional()
  senderOfficeId?: number;

  @IsInt()
  @IsOptional()
  senderClientId?: number;

  // Услуги
  @IsInt()
  @IsOptional()
  serviceId?: number;

  @IsBoolean()
  @IsOptional()
  codEnabled?: boolean;

  @IsString()
  @IsOptional()
  @IsIn(['CASH', 'POSTAL_MONEY_TRANSFER'])
  codProcessingType?: string;

  @IsBoolean()
  @IsOptional()
  declaredValueEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  saturdayDelivery?: boolean;

  @IsInt()
  @IsOptional()
  @IsIn([0, 1, 2])
  deferredDays?: number;

  @IsString()
  @IsOptional()
  @IsIn(['SENDER', 'RECIPIENT', 'THIRD_PARTY'])
  payerType?: string;
}
