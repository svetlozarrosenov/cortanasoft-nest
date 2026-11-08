import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsEnum,
  IsIn,
  Min,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DeliveryType } from '@prisma/client';

/** Ред от описа на пратката (Еконт: PackingListElement; иска се при НП по департамент) */
export class ShipmentPackingItemDto {
  // Инвентарен/артикулен номер — Еконт го изисква за всеки ред от описа
  @IsString()
  @IsOptional()
  inventoryNum?: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  count: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  weight?: number;
}

export class CreateShipmentDto {
  @IsString()
  orderId: string;

  // Опис на стоките в пратката (от отметнатите в модала). Ако липсва,
  // бекендът го прави от редовете на продажбата.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShipmentPackingItemDto)
  items?: ShipmentPackingItemDto[];

  @IsString()
  @IsIn(['econt', 'speedy', 'pigeon'])
  provider: string;

  @IsEnum(DeliveryType)
  deliveryType: DeliveryType;

  // Получател
  @IsString()
  receiverName: string;

  @IsString()
  receiverPhone: string;

  // Офис (Econt)
  @IsString()
  @IsOptional()
  officeCode?: string;

  @IsString()
  @IsOptional()
  officeName?: string;

  // Офис (Speedy)
  @IsInt()
  @IsOptional()
  speedyOfficeId?: number;

  @IsInt()
  @IsOptional()
  speedySiteId?: number;

  // Адрес
  @IsString()
  @IsOptional()
  addressCity?: string;

  @IsString()
  @IsOptional()
  addressPostCode?: string;

  @IsString()
  @IsOptional()
  addressStreet?: string;

  @IsString()
  @IsOptional()
  addressNum?: string;

  @IsString()
  @IsOptional()
  addressOther?: string;

  // Package
  @IsNumber()
  @Min(0.01)
  weight: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  packCount?: number;

  @IsNumber()
  @IsOptional()
  dimensionsL?: number;

  @IsNumber()
  @IsOptional()
  dimensionsW?: number;

  @IsNumber()
  @IsOptional()
  dimensionsH?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @IsIn(['BOX', 'ENVELOPE', 'BAG', 'PALLET'])
  packageType?: string;

  // COD
  @IsNumber()
  @IsOptional()
  @Min(0)
  codAmount?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  // Sender config overrides (per-order)
  @IsInt()
  @IsOptional()
  serviceId?: number;

  @IsString()
  @IsOptional()
  payerType?: string;

  @IsString()
  @IsOptional()
  senderName?: string;

  @IsString()
  @IsOptional()
  senderPhone?: string;

  @IsString()
  @IsOptional()
  senderOfficeCode?: string;

  @IsInt()
  @IsOptional()
  senderSiteId?: number;

  @IsInt()
  @IsOptional()
  senderOfficeId?: number;

  @IsOptional()
  saturdayDelivery?: boolean;

  @IsOptional()
  codEnabled?: boolean;

  @IsString()
  @IsOptional()
  codProcessingType?: string;

  @IsOptional()
  declaredValueEnabled?: boolean;

  // Обявена стойност за тази пратка (по подразбиране = стойността на
  // стоката); без нея се ползва сумата за НП, както досега
  @IsNumber()
  @IsOptional()
  @Min(0)
  declaredValueAmount?: number;

  // Override на настройката „SMS известие" само за тази пратка
  @IsOptional()
  smsNotification?: boolean;

  @IsString()
  @IsOptional()
  shipmentType?: string;

  @IsString()
  @IsOptional()
  paymentBy?: string;

  // Кой плаща куриера: sender (фирмата) | receiver (клиентът). Пази се в
  // пратката; за Еконт става paymentBy, за Спиди — payerType.
  @IsIn(['sender', 'receiver'])
  @IsOptional()
  payer?: 'sender' | 'receiver';

  // === Pigeon Express (виж pigeon/pigeon.service.ts) ===

  // До адрес / офис / автомат; без него се извежда от deliveryType
  @IsString()
  @IsOptional()
  @IsIn(['address', 'office', 'locker'])
  pigeonDeliveryKind?: string;

  // Офис или автомат на получателя (id от номенклатурата на Pigeon)
  @IsInt()
  @IsOptional()
  pigeonOfficeId?: number;

  // Адрес по номенклатурата на Pigeon: град и улица по id
  @IsInt()
  @IsOptional()
  pigeonCityId?: number;

  @IsInt()
  @IsOptional()
  pigeonStreetId?: number;

  @IsString()
  @IsOptional()
  pigeonEntrance?: string;

  @IsString()
  @IsOptional()
  pigeonFloor?: string;

  @IsString()
  @IsOptional()
  pigeonApartment?: string;

  // Свободен текст към адреса (задължителен при Pigeon, когато улицата не е от номенклатурата)
  @IsString()
  @IsOptional()
  pigeonAdditionalInfo?: string;

  // Override на подателя само за тази пратка: откъде куриерът взема пратката
  @IsString()
  @IsOptional()
  @IsIn(['address', 'office', 'locker'])
  pigeonPickupType?: string;

  @IsInt()
  @IsOptional()
  pigeonPickupOfficeId?: number;

  @IsInt()
  @IsOptional()
  pigeonSenderAddressId?: number;

  @IsString()
  @IsOptional()
  @IsIn(['standard', 'express'])
  pigeonServiceType?: string;

  @IsOptional()
  pigeonReturnAtMyExpense?: boolean;

  @IsString()
  @IsOptional()
  receiverEmail?: string;

  // Бележка за куриера (не е описание на съдържанието)
  @IsString()
  @IsOptional()
  note?: string;
}

export class CalculateShippingDto {
  @IsString()
  @IsIn(['econt', 'speedy', 'pigeon'])
  provider: string;

  @IsEnum(DeliveryType)
  deliveryType: DeliveryType;

  // Econt office
  @IsString()
  @IsOptional()
  officeCode?: string;

  // Speedy office/site
  @IsInt()
  @IsOptional()
  speedyOfficeId?: number;

  @IsInt()
  @IsOptional()
  speedySiteId?: number;

  // Address
  @IsString()
  @IsOptional()
  addressCity?: string;

  @IsString()
  @IsOptional()
  addressPostCode?: string;

  @IsString()
  @IsOptional()
  addressStreet?: string;

  @IsString()
  @IsOptional()
  addressNum?: string;

  @IsNumber()
  @Min(0.01)
  weight: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  packCount?: number;

  @IsNumber()
  @IsOptional()
  dimensionsL?: number;

  @IsNumber()
  @IsOptional()
  dimensionsW?: number;

  @IsNumber()
  @IsOptional()
  dimensionsH?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  codAmount?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  // === Sender config overrides (per-order, frontend попълва defaults от config) ===

  @IsInt()
  @IsOptional()
  serviceId?: number;

  @IsString()
  @IsOptional()
  payerType?: string;

  @IsString()
  @IsOptional()
  senderName?: string;

  @IsString()
  @IsOptional()
  senderPhone?: string;

  @IsString()
  @IsOptional()
  senderOfficeCode?: string;

  @IsInt()
  @IsOptional()
  senderSiteId?: number;

  @IsInt()
  @IsOptional()
  senderOfficeId?: number;

  @IsOptional()
  saturdayDelivery?: boolean;

  @IsOptional()
  codEnabled?: boolean;

  @IsString()
  @IsOptional()
  codProcessingType?: string;

  @IsOptional()
  declaredValueEnabled?: boolean;

  // Обявена стойност за тази пратка (по подразбиране = стойността на
  // стоката); без нея се ползва сумата за НП, както досега
  @IsNumber()
  @IsOptional()
  @Min(0)
  declaredValueAmount?: number;

  // Override на настройката „SMS известие" само за тази пратка
  @IsOptional()
  smsNotification?: boolean;

  @IsString()
  @IsOptional()
  shipmentType?: string;

  @IsString()
  @IsOptional()
  paymentBy?: string;

  // Кой плаща куриера: sender (фирмата) | receiver (клиентът). Пази се в
  // пратката; за Еконт става paymentBy, за Спиди — payerType.
  @IsIn(['sender', 'receiver'])
  @IsOptional()
  payer?: 'sender' | 'receiver';

  // === Pigeon Express (виж pigeon/pigeon.service.ts) ===

  // До адрес / офис / автомат; без него се извежда от deliveryType
  @IsString()
  @IsOptional()
  @IsIn(['address', 'office', 'locker'])
  pigeonDeliveryKind?: string;

  // Офис или автомат на получателя (id от номенклатурата на Pigeon)
  @IsInt()
  @IsOptional()
  pigeonOfficeId?: number;

  // Адрес по номенклатурата на Pigeon: град и улица по id
  @IsInt()
  @IsOptional()
  pigeonCityId?: number;

  @IsInt()
  @IsOptional()
  pigeonStreetId?: number;

  @IsString()
  @IsOptional()
  pigeonEntrance?: string;

  @IsString()
  @IsOptional()
  pigeonFloor?: string;

  @IsString()
  @IsOptional()
  pigeonApartment?: string;

  // Свободен текст към адреса (задължителен при Pigeon, когато улицата не е от номенклатурата)
  @IsString()
  @IsOptional()
  pigeonAdditionalInfo?: string;

  // Override на подателя само за тази пратка: откъде куриерът взема пратката
  @IsString()
  @IsOptional()
  @IsIn(['address', 'office', 'locker'])
  pigeonPickupType?: string;

  @IsInt()
  @IsOptional()
  pigeonPickupOfficeId?: number;

  @IsInt()
  @IsOptional()
  pigeonSenderAddressId?: number;

  @IsString()
  @IsOptional()
  @IsIn(['standard', 'express'])
  pigeonServiceType?: string;

  @IsOptional()
  pigeonReturnAtMyExpense?: boolean;

  @IsString()
  @IsOptional()
  receiverEmail?: string;

  // Бележка за куриера (не е описание на съдържанието)
  @IsString()
  @IsOptional()
  note?: string;
}
