import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTerminationDto {
  @IsString()
  userId: string;

  // Договорът, който се прекратява (1:1)
  @IsOptional()
  @IsString()
  contractId?: string;

  @IsString()
  basis: string;

  @IsString()
  date: string;

  @IsOptional()
  @IsString()
  noticeServedAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  compensation?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
