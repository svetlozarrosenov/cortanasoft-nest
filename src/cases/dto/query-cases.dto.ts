import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CaseChannel, CasePriority, CaseStatus } from '@prisma/client';

export const CASE_LIST_VIEWS = ['open', 'mine', 'waiting', 'all'] as const;
export type CaseListView = (typeof CASE_LIST_VIEWS)[number];

export const CASE_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'caseNumber',
  'status',
  'priority',
  'subject',
] as const;

export class QueryCasesDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(CASE_LIST_VIEWS)
  view?: CaseListView;

  @IsOptional()
  @IsEnum(CaseStatus)
  status?: CaseStatus;

  @IsOptional()
  @IsEnum(CasePriority)
  priority?: CasePriority;

  @IsOptional()
  @IsEnum(CaseChannel)
  channel?: CaseChannel;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsIn(CASE_SORT_FIELDS)
  sortBy?: (typeof CASE_SORT_FIELDS)[number] = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
