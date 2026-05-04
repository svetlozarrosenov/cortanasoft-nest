import { PartialType } from '@nestjs/mapped-types';
import { CreateStockReceiptDto } from './create-stock-receipt.dto';

export class UpdateStockReceiptDto extends PartialType(CreateStockReceiptDto) {}
