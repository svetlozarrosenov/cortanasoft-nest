import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CaseChannel, CasePriority } from '@prisma/client';

export class CreateCaseDto {
  @IsString()
  customerId: string;

  // Снимка на контакта към момента на създаване (по подразбиране от клиента)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  contactName?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactPhone?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  subject: string;

  // Вижда се от клиента на публичната страница
  @IsString()
  @MinLength(3)
  description: string;

  @IsOptional()
  @IsEnum(CasePriority)
  priority?: CasePriority;

  @IsOptional()
  @IsEnum(CaseChannel)
  channel?: CaseChannel;

  @IsOptional()
  @IsString()
  assignedToId?: string;
}
