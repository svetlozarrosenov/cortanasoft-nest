import { Injectable } from '@nestjs/common';
import { EmployeeSignatureType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmployeeRecordAuditService } from './employee-record-audit.service';

// Категориите документи по чл. 6, ал. 1 от наредбата
export const DOCUMENT_CATEGORY_KEYS = [
  'EMPLOYER_UNILATERAL', // едностранни от работодателя (заповеди, удостоверения...)
  'EMPLOYEE_UNILATERAL', // едностранни от служителя (молби, декларации...)
  'BILATERAL', // двустранни (трудов договор, допълнителни споразумения)
  'THIRD_PARTY', // от трети лица (болнични, дипломи, запори...)
  'OTHER', // други данни и информация
] as const;

export interface UpdateSettingsDto {
  electronicCategories?: string[];
  employeeSignatureLevel?: EmployeeSignatureType;
  notificationPolicy?: string | null;
}

/**
 * Вътрешни правила за е-досиетата (чл. 3 + чл. 6, ал. 2 от наредбата):
 * кои категории документи се водят електронно, какъв е-подпис използват
 * служителите и какъв е редът за уведомяването им. Отразява съдържанието,
 * което трябва да присъства и в ПВТР на компанията.
 */
@Injectable()
export class EmployeeRecordsSettingsService {
  constructor(
    private prisma: PrismaService,
    private audit: EmployeeRecordAuditService,
  ) {}

  async get(companyId: string) {
    const settings = await this.prisma.employeeRecordsSettings.findUnique({
      where: { companyId },
    });
    return {
      electronicCategories: settings?.electronicCategories ?? [],
      employeeSignatureLevel: settings?.employeeSignatureLevel ?? 'SES',
      notificationPolicy: settings?.notificationPolicy ?? null,
      availableCategories: DOCUMENT_CATEGORY_KEYS,
    };
  }

  async update(companyId: string, actorId: string, dto: UpdateSettingsDto) {
    const data = {
      ...(dto.electronicCategories !== undefined
        ? {
            electronicCategories: dto.electronicCategories.filter((c) =>
              (DOCUMENT_CATEGORY_KEYS as readonly string[]).includes(c),
            ),
          }
        : {}),
      ...(dto.employeeSignatureLevel !== undefined
        ? { employeeSignatureLevel: dto.employeeSignatureLevel }
        : {}),
      ...(dto.notificationPolicy !== undefined
        ? { notificationPolicy: dto.notificationPolicy || null }
        : {}),
    };

    await this.prisma.employeeRecordsSettings.upsert({
      where: { companyId },
      create: { companyId, ...data },
      update: data,
    });

    await this.audit.log(companyId, {
      action: 'SETTINGS_UPDATE',
      actorId,
      entityType: 'employeeRecordsSettings',
      detail: JSON.stringify(dto),
    });

    return this.get(companyId);
  }
}
