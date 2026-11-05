import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  Min,
  IsEnum,
  IsArray,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

// „Коригирай“ = анулирай фактурата и издай нова от текущото състояние на
// продажбата в една транзакция. Полетата са същите като при издаване; кои се
// четат зависи от вида на коригираната фактура (обикновена/авансова/окончателна).
export type CorrectInvoiceMode = 'REISSUE' | 'IN_PLACE';

export class CorrectInvoiceDto {
  // REISSUE (по подразбиране): анулирай + нова с нов номер (ЗДДС чл. 116).
  // IN_PLACE: същият номер — съдържанието на фактурата се заменя с това от
  // продажбата. Само ако фактурата още не е дадена на клиента/счетоводителя;
  // решението е на оператора.
  @IsOptional()
  @IsIn(['REISSUE', 'IN_PLACE'])
  mode?: CorrectInvoiceMode;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsDateString()
  invoiceDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  billToCustomerId?: string;

  // Само за авансова: нова сума (по подразбиране — сумата на коригираната)
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount?: number;

  // Само за авансова: описание на реда
  @IsOptional()
  @IsString()
  itemDescription?: string;

  // Само за окончателна: кои аванси да се приспаднат (по подразбиране — същите)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  advanceInvoiceIds?: string[];

  @IsOptional()
  @IsString()
  deductionDescriptionTemplate?: string;
}
