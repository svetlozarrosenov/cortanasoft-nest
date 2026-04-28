import { IsString, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';

export class AddServiceLaborDto {
  @IsString()
  description: string;

  @IsNumber()
  @Min(0.01)
  hours: number;

  @IsNumber()
  @Min(0)
  hourlyRate: number;

  @IsBoolean()
  @IsOptional()
  isWarranty?: boolean;
}
