import {
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsOptional,
  ValidateIf,
} from 'class-validator';

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

  // Партньорски акаунт: Customer (isPartner=true) от същата компания, чиито
  // клиенти този потребител ще вижда в CRM. null/празно = обикновен акаунт.
  @ValidateIf((o) => o.partnerCustomerId !== null)
  @IsOptional()
  @IsString()
  partnerCustomerId?: string | null;
}
