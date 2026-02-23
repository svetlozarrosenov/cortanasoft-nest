import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PerformanceReviewType {
  PROBATION = 'PROBATION',
  QUARTERLY = 'QUARTERLY',
  SEMI_ANNUAL = 'SEMI_ANNUAL',
  ANNUAL = 'ANNUAL',
  PROJECT = 'PROJECT',
  SELF_ASSESSMENT = 'SELF_ASSESSMENT',
}

export enum PerformanceRating {
  EXCEPTIONAL = 'EXCEPTIONAL',
  EXCEEDS = 'EXCEEDS',
  MEETS = 'MEETS',
  NEEDS_IMPROVEMENT = 'NEEDS_IMPROVEMENT',
  UNSATISFACTORY = 'UNSATISFACTORY',
}

export enum PerformanceItemType {
  KPI = 'KPI',
  COMPETENCY = 'COMPETENCY',
  GOAL = 'GOAL',
  BEHAVIOR = 'BEHAVIOR',
}

export class CreatePerformanceReviewItemDto {
  @IsEnum(PerformanceItemType)
  type: PerformanceItemType;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  weight?: number;

  @IsOptional()
  @IsString()
  targetValue?: string;

  @IsOptional()
  @IsString()
  actualValue?: string;

  @IsOptional()
  @IsEnum(PerformanceRating)
  rating?: PerformanceRating;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  score?: number;

  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsEnum(PerformanceRating)
  selfRating?: PerformanceRating;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  selfScore?: number;

  @IsOptional()
  @IsString()
  selfComments?: string;
}

export class CreatePerformanceReviewDto {
  @IsString()
  title: string;

  @IsEnum(PerformanceReviewType)
  type: PerformanceReviewType;

  @IsDateString()
  periodStart: string;

  @IsDateString()
  periodEnd: string;

  @IsOptional()
  @IsDateString()
  reviewDate?: string;

  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  reviewerId?: string;

  @IsOptional()
  @IsEnum(PerformanceRating)
  overallRating?: PerformanceRating;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  overallScore?: number;

  @IsOptional()
  @IsString()
  achievements?: string;

  @IsOptional()
  @IsString()
  areasToImprove?: string;

  @IsOptional()
  @IsString()
  managerComments?: string;

  @IsOptional()
  @IsString()
  employeeComments?: string;

  @IsOptional()
  @IsString()
  developmentPlan?: string;

  @IsOptional()
  @IsString()
  nextPeriodGoals?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePerformanceReviewItemDto)
  items?: CreatePerformanceReviewItemDto[];
}
