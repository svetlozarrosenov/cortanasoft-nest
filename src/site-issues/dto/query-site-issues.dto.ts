import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SiteIssueStatus } from '@prisma/client';

export class QuerySiteIssuesDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(SiteIssueStatus)
  @IsOptional()
  status?: SiteIssueStatus;

  @IsString()
  @IsOptional()
  siteId?: string;

  @IsString()
  @IsOptional()
  locationId?: string;

  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
