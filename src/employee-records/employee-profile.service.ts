import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { encryptSecret, decryptSecret } from './crypto.util';
import { UpdateEmployeeProfileDto } from './dto/update-employee-profile.dto';

@Injectable()
export class EmployeeProfileService {
  constructor(private prisma: PrismaService) {}

  private async getUserCompany(companyId: string, userId: string) {
    const uc = await this.prisma.userCompany.findUnique({
      where: { userId_companyId: { userId, companyId } },
    });
    if (!uc) {
      throw new NotFoundException('Служителят не е намерен в тази компания');
    }
    return uc;
  }

  /** Връща профила с дешифрирано ЕГН (само за hr.employeeRecords). */
  async get(companyId: string, userId: string) {
    const uc = await this.getUserCompany(companyId, userId);
    let egn: string | null = null;
    if (uc.personalIdEncrypted) {
      try {
        egn = decryptSecret(uc.personalIdEncrypted);
      } catch {
        egn = null; // повреден/нечетим запис — не чупим UI-я
      }
    }
    return {
      userId,
      egn,
      birthDate: uc.birthDate,
      personalAddress: uc.personalAddress,
      idCardNumber: uc.idCardNumber,
      hireDate: uc.hireDate,
    };
  }

  async update(companyId: string, userId: string, dto: UpdateEmployeeProfileDto) {
    await this.getUserCompany(companyId, userId);
    const data: Record<string, unknown> = {};

    if (dto.egn !== undefined) {
      data.personalIdEncrypted = dto.egn ? encryptSecret(dto.egn) : null;
    }
    if (dto.birthDate !== undefined) {
      data.birthDate = dto.birthDate ? new Date(dto.birthDate) : null;
    }
    if (dto.personalAddress !== undefined) {
      data.personalAddress = dto.personalAddress || null;
    }
    if (dto.idCardNumber !== undefined) {
      data.idCardNumber = dto.idCardNumber || null;
    }
    if (dto.hireDate !== undefined) {
      data.hireDate = dto.hireDate ? new Date(dto.hireDate) : null;
    }

    await this.prisma.userCompany.update({
      where: { userId_companyId: { userId, companyId } },
      data,
    });
    return this.get(companyId, userId);
  }
}
