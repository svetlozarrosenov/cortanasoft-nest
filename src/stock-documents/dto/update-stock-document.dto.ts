import { PartialType } from '@nestjs/mapped-types';
import { CreateStockDocumentDto } from './create-stock-document.dto';

export class UpdateStockDocumentDto extends PartialType(CreateStockDocumentDto) {}
