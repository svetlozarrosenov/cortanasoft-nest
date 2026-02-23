import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateMemberDto {
  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsBoolean()
  isHead?: boolean;
}
