import { PartialType } from '@nestjs/mapped-types';
import { CreateDealTaskDto } from './create-deal-task.dto';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateDealTaskDto extends PartialType(CreateDealTaskDto) {
  @IsOptional()
  @IsBoolean()
  isDone?: boolean;
}
