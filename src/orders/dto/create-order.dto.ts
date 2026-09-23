import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  Max,
  IsEnum,
  IsEmail,
  IsBoolean,
  IsIn,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

export class CreateOrderItemDto {
  @IsString()
  productId: string;

  // Описание на реда за документите; празно = името на продукта
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsNumber()
  @IsOptional()
  vatRate?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  discount?: number;

  @IsString()
  @IsOptional()
  inventoryBatchId?: string;

  @IsString()
  @IsOptional()
  inventorySerialId?: string;

  @IsString()
  @IsOptional()
  locationId?: string;

  // Директна доставка от доставчик към клиента — редът не се изписва от
  // склад. Изисква право erp.directDelivery (проверява се в контролера).
  @IsBoolean()
  @IsOptional()
  directDelivery?: boolean;
}

/**
 * Плащане, получено при създаването на продажбата (напр. в брой на място).
 * Записва се в същата транзакция като поръчката — иначе при грешка остава
 * поръчка без плащане или плащане без поръчка.
 */
export class CreateOrderPaymentDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsEnum(PaymentMethod)
  @IsOptional()
  method?: PaymentMethod;

  @IsDateString()
  @IsOptional()
  paidAt?: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateOrderDto {
  @IsString()
  @IsOptional()
  orderNumber?: string;

  // ID на същата поръчка в свързаната custom-website / shop система.
  // Optional — позволено е cortana да създаде поръчка без shop връзка.
  @IsString()
  @IsOptional()
  externalId?: string;

  @IsString()
  @IsOptional()
  orderDate?: string;

  @IsString()
  @IsOptional()
  customerId?: string;

  // Получател на фактурата (bill-to), ако е различен от клиента по поръчката
  @IsString()
  @IsOptional()
  billToCustomerId?: string;

  // Обект (ферма/площадка), към който се причислява продажбата
  @IsString()
  @IsOptional()
  siteId?: string;

  @IsString()
  customerName: string;

  @IsEmail()
  @IsOptional()
  customerEmail?: string;

  @IsString()
  @IsOptional()
  customerPhone?: string;

  // Доставка
  @IsString()
  @IsOptional()
  deliveryMethod?: string; // none, manual, econt_office, econt_address

  @IsString()
  @IsOptional()
  shippingAddress?: string;

  @IsString()
  @IsOptional()
  shippingCity?: string;

  @IsString()
  @IsOptional()
  shippingPostalCode?: string;

  @IsString()
  @IsOptional()
  receiverName?: string;

  @IsString()
  @IsOptional()
  receiverPhone?: string;

  @IsString()
  @IsOptional()
  econtOfficeCode?: string;

  @IsString()
  @IsOptional()
  econtOfficeName?: string;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsString()
  @IsOptional()
  locationId?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  shippingCost?: number;

  // Отстъпка на документа (преди ДДС). Задава се или като сума (discount),
  // или като процент (discountPercent) — при подаден процент сумата се
  // изчислява от backend-а и подаденият discount се игнорира.
  @IsNumber()
  @IsOptional()
  @Min(0)
  discount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  currencyId?: string;

  @IsString()
  @IsOptional()
  sourceOfferId?: string;

  @IsBoolean()
  @IsOptional()
  autoConfirm?: boolean;

  // Само за интеграции (WooCommerce/CloudCart) — UI-ят подава `payments`
  @IsIn(['PENDING', 'PARTIAL', 'PAID'])
  @IsOptional()
  paymentStatus?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderPaymentDto)
  @IsOptional()
  payments?: CreateOrderPaymentDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
