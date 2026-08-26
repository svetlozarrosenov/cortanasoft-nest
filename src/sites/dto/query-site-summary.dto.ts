import { IsDateString, IsOptional } from 'class-validator';

export class QuerySiteSummaryDto {
  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @IsDateString()
  @IsOptional()
  dateTo?: string;
}
