import { IsBoolean, IsOptional } from 'class-validator';

/** Настройки > куриер > „Автоматизация на пратките" — общи за всички куриери. */
export class UpdateShippingAutomationDto {
  @IsOptional()
  @IsBoolean()
  syncStatuses?: boolean;

  @IsOptional()
  @IsBoolean()
  markOrdersDelivered?: boolean;

  @IsOptional()
  @IsBoolean()
  recordCodPayments?: boolean;
}
