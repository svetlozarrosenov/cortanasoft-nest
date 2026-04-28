import { IsString, IsOptional } from 'class-validator';

export class StartTimeLogDto {
  @IsString()
  @IsOptional()
  notes?: string;
}

export class StopTimeLogDto {
  @IsString()
  @IsOptional()
  notes?: string;
}
