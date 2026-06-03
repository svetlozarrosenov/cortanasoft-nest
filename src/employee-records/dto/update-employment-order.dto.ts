import { PartialType } from '@nestjs/mapped-types';
import { CreateEmploymentOrderDto } from './create-employment-order.dto';

export class UpdateEmploymentOrderDto extends PartialType(
  CreateEmploymentOrderDto,
) {}
