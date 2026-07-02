import {
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  DossierCopyRequestKind,
  EmployeeConsentAction,
  EmployeeRecordAuditAction,
  EmployeeSignatureType,
  EmployeeSubmissionCategory,
  EmployeeSubmissionStatus,
} from '@prisma/client';

export class RecordConsentDto {
  @IsEnum(EmployeeConsentAction)
  action: EmployeeConsentAction;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateEmployeeRecordsSettingsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  electronicCategories?: string[];

  @IsOptional()
  @IsEnum(EmployeeSignatureType)
  employeeSignatureLevel?: EmployeeSignatureType;

  @IsOptional()
  @IsString()
  notificationPolicy?: string;
}

export class CreateEmployeeSubmissionDto {
  @IsOptional()
  @IsEnum(EmployeeSubmissionCategory)
  category?: EmployeeSubmissionCategory;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsOptional()
  @IsString()
  content?: string;
}

export class AnswerSubmissionDto {
  @IsEnum(EmployeeSubmissionStatus)
  status: EmployeeSubmissionStatus;

  @IsOptional()
  @IsString()
  answer?: string;
}

export class CreateCopyRequestDto {
  @IsEnum(DossierCopyRequestKind)
  kind: DossierCopyRequestKind;

  @IsOptional()
  @IsString()
  scope?: string;
}

export class ResolveCopyRequestDto {
  @IsIn(['FULFILLED', 'REJECTED'])
  status: 'FULFILLED' | 'REJECTED';

  @IsOptional()
  @IsString()
  responseNote?: string;
}

export class CreateSignatureRequestDto {
  @IsString()
  @IsNotEmpty()
  fileId: string;

  @IsString()
  @IsNotEmpty()
  signerUserId: string;

  @IsOptional()
  @IsEnum(EmployeeSignatureType)
  level?: EmployeeSignatureType;
}

export class DeclineSignatureRequestDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class QueryAuditDto {
  @IsOptional()
  @IsString()
  targetUserId?: string;

  @IsOptional()
  @IsString()
  actorId?: string;

  @IsOptional()
  @IsEnum(EmployeeRecordAuditAction)
  action?: EmployeeRecordAuditAction;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

// Проследяване на хартиените преписи (чл. 12, ал. 1, т. 4)
export class LogPrintDto {
  @IsString()
  @IsNotEmpty()
  entityType: string;

  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsOptional()
  @IsString()
  targetUserId?: string;

  @IsOptional()
  @IsString()
  detail?: string;
}
