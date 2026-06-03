import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEmploymentAnnexDto {
  @IsString()
  userId: string;

  @IsString()
  contractId: string;

  @IsOptional()
  @IsString()
  number?: string;

  @IsString()
  effectiveDate: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  newSalary?: number;

  @IsOptional()
  @IsString()
  newPosition?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  newWorkingHours?: number;

  @IsOptional()
  @IsString()
  newEndDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
