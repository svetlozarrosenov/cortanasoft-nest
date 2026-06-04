import { IsOptional, IsString } from 'class-validator';

export class CreateJobDescriptionDto {
  @IsString()
  position: string;

  @IsOptional()
  @IsString()
  responsibilities?: string;

  @IsOptional()
  @IsString()
  requirements?: string;
}
