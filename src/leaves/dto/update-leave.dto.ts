import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  IsBoolean,
  Min,
  MaxLength,
} from 'class-validator';
import { LeaveType } from './create-leave.dto';

export class UpdateLeaveDto {
  @IsEnum(LeaveType)
  @IsOptional()
  type?: LeaveType;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  days?: number;

  @IsBoolean()
  @IsOptional()
  halfDay?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  reason?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  documentNumber?: string;

  @IsString()
  @IsOptional()
  attachmentKey?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  attachmentName?: string;
}

export class ApproveLeaveDto {
  @IsString()
  @IsOptional()
  note?: string;
}

export class RejectLeaveDto {
  @IsString()
  rejectionNote: string;
}

export class AdjustBalanceDto {
  // Пренос от предходна година (дни)
  @IsInt()
  @Min(0)
  @IsOptional()
  annualCarried?: number;

  // Ръчна квота за годината (null нулира корекцията и връща подразбиращата се)
  @IsInt()
  @Min(0)
  @IsOptional()
  annualTotalOverride?: number | null;
}
