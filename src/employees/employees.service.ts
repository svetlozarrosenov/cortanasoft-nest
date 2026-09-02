import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateEmployeeDto } from './dto';

const USER_COMPANY_INCLUDE = {
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  role: {
    select: {
      id: true,
      name: true,
      description: true,
    },
  },
  position: {
    select: { id: true, name: true, hourlyRate: true },
  },
};

function mapUserCompany(uc: any, defaultVacationDays: number) {
  return {
    id: uc.user.id,
    email: uc.user.email,
    firstName: uc.user.firstName,
    lastName: uc.user.lastName,
    isActive: uc.user.isActive,
    role: uc.role,
    isDefault: uc.isDefault,
    // Индивидуални дни отпуск (override) и ефективните: индивидуалните, иначе фирмените
    maxVacationDays: uc.maxVacationDays,
    effectiveVacationDays: uc.maxVacationDays ?? defaultVacationDays,
    position: uc.position ? { id: uc.position.id, name: uc.position.name } : null,
    // Лична ставка (override) и ефективната: личната, иначе тази на позицията
    hourlyRate: uc.hourlyRate != null ? Number(uc.hourlyRate) : null,
    effectiveHourlyRate:
      uc.hourlyRate != null
        ? Number(uc.hourlyRate)
        : uc.position?.hourlyRate != null
          ? Number(uc.position.hourlyRate)
          : null,
    createdAt: uc.user.createdAt,
    updatedAt: uc.user.updatedAt,
  };
}

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const userCompanies = await this.prisma.userCompany.findMany({
      where: { companyId },
      include: USER_COMPANY_INCLUDE,
      orderBy: {
        user: {
          firstName: 'asc',
        },
      },
    });

    return {
      data: userCompanies.map((uc) => mapUserCompany(uc, company.defaultAnnualLeaveDays)),
      meta: {
        total: userCompanies.length,
      },
    };
  }

  async findOne(companyId: string, userId: string) {
    const userCompany = await this.prisma.userCompany.findFirst({
      where: { companyId, userId },
      include: USER_COMPANY_INCLUDE,
    });

    if (!userCompany) {
      throw new NotFoundException('Employee not found in this company');
    }

    return mapUserCompany(userCompany, await this.defaultVacationDays(companyId));
  }

  async update(companyId: string, userId: string, data: UpdateEmployeeDto) {
    const userCompany = await this.prisma.userCompany.findFirst({
      where: { companyId, userId },
    });

    if (!userCompany) {
      throw new NotFoundException('Employee not found in this company');
    }

    if (data.positionId) {
      const position = await this.prisma.position.findFirst({
        where: { id: data.positionId, companyId },
        select: { id: true },
      });
      if (!position) throw new BadRequestException('Позицията не е от тази компания');
    }

    const updated = await this.prisma.userCompany.update({
      where: { id: userCompany.id },
      data: {
        // null = изчисти индивидуалната стойност → важи фирменият дефолт
        ...(data.maxVacationDays !== undefined ? { maxVacationDays: data.maxVacationDays } : {}),
        ...(data.positionId !== undefined ? { positionId: data.positionId } : {}),
        ...(data.hourlyRate !== undefined ? { hourlyRate: data.hourlyRate } : {}),
      },
      include: USER_COMPANY_INCLUDE,
    });

    return mapUserCompany(updated, await this.defaultVacationDays(companyId));
  }

  private async defaultVacationDays(companyId: string): Promise<number> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { defaultAnnualLeaveDays: true },
    });
    return company?.defaultAnnualLeaveDays ?? 20;
  }
}
