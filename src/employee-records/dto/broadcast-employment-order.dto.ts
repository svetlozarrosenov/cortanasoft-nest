import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { EmploymentOrderType } from '@prisma/client';

// Издаване на една заповед към много служители (пиши веднъж → fan-out).
export class BroadcastEmploymentOrderDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  userIds: string[];

  @IsOptional()
  @IsEnum(EmploymentOrderType)
  type?: EmploymentOrderType;

  @IsString()
  date: string;

  @IsString()
  subject: string;

  @IsOptional()
  @IsString()
  content?: string;
}
