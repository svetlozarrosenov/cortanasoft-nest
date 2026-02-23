import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
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

  @IsString()
  @IsOptional()
  reason?: string;
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
