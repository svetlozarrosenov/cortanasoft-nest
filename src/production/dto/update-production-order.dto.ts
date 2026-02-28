import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateProductionOrderDto } from './create-production-order.dto';

export class UpdateProductionOrderDto extends PartialType(
  OmitType(CreateProductionOrderDto, ['orderNumber'] as const),
) {}
