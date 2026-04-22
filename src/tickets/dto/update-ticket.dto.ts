import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { TicketPriority, TicketStatus, TicketType } from './create-ticket.dto';

export class UpdateTicketDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TicketType)
  type?: TicketType;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsDateString()
  plannedStartDate?: string;

  @IsOptional()
  @IsDateString()
  plannedEndDate?: string;

  @IsOptional()
  @IsNumber()
  estimatedHours?: number;

  @IsOptional()
  @IsNumber()
  actualHours?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(24)
  hoursPerDay?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(7)
  workingDaysPerWeek?: number;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  sprintId?: string;

  @IsOptional()
  @IsNumber()
  rank?: number;
}
