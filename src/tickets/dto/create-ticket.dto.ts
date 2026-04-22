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

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum TicketStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  IN_REVIEW = 'IN_REVIEW',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
}

export enum TicketType {
  TASK = 'TASK',
  BUG = 'BUG',
  FEATURE = 'FEATURE',
  IMPROVEMENT = 'IMPROVEMENT',
  SUPPORT = 'SUPPORT',
}

export class CreateTicketDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TicketType)
  type?: TicketType;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsDateString()
  plannedStartDate: string;

  @IsDateString()
  plannedEndDate: string;

  @IsOptional()
  @IsNumber()
  estimatedHours?: number;

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
