import { IsString, IsOptional, IsBoolean, IsInt, IsIn } from 'class-validator';

export class UpdatePigeonConfigDto {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  // Достъп
  @IsString()
  @IsOptional()
  apiKey?: string;

  @IsString()
  @IsOptional()
  apiSecret?: string;

  @IsString()
  @IsOptional()
  @IsIn(['sandbox', 'live'])
  mode?: string;

  // Подател
  @IsString()
  @IsOptional()
  @IsIn(['address', 'office', 'locker'])
  pickupType?: string;

  @IsInt()
  @IsOptional()
  pickupOfficeId?: number | null;

  @IsInt()
  @IsOptional()
  senderAddressId?: number | null;

  // Подразбирания за пратка
  @IsString()
  @IsOptional()
  @IsIn(['standard', 'express'])
  serviceType?: string;

  @IsString()
  @IsOptional()
  @IsIn(['sender', 'receiver'])
  whoPays?: string;

  @IsBoolean()
  @IsOptional()
  codEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  declaredValueEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  smsNotification?: boolean;

  @IsBoolean()
  @IsOptional()
  returnAtMyExpense?: boolean;
}
