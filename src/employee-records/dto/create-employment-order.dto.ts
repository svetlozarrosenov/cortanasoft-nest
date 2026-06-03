import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EmploymentOrderType } from '@prisma/client';

export class CreateEmploymentOrderDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  number?: string;

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
