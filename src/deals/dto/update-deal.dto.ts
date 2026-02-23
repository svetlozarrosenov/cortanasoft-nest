import { PartialType } from '@nestjs/mapped-types';
import { CreateDealDto } from './create-deal.dto';
import { IsOptional, IsBoolean, IsDateString, IsString } from 'class-validator';

export class UpdateDealDto extends PartialType(CreateDealDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  actualCloseDate?: string;

  @IsOptional()
  @IsString()
  lostReason?: string;
}
