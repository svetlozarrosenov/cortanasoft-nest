import { IsOptional, IsString, IsDateString } from 'class-validator';
import { IsReasonableDate } from '../../common/validators/is-reasonable-date.validator';

export class UpdateInventoryBatchDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  @IsReasonableDate()
  expiryDate?: string;

  @IsOptional()
  @IsDateString()
  @IsReasonableDate()
  manufacturingDate?: string;

  @IsOptional()
  @IsString()
  storageZoneId?: string;
}
