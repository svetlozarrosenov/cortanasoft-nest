import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsObject,
} from 'class-validator';
import type { RolePermissions } from '../../common/config/permissions.config';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  permissions?: RolePermissions;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsString()
  @IsNotEmpty()
  companyId: string;
}
