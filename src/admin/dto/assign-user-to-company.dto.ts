import { IsNotEmpty, IsString, IsBoolean, IsOptional } from 'class-validator';

export class AssignUserToCompanyDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  roleId: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
