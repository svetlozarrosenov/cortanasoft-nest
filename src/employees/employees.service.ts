import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
};

function mapUserCompany(uc: any) {
  return {
    id: uc.user.id,
    email: uc.user.email,
    firstName: uc.user.firstName,
    lastName: uc.user.lastName,
    isActive: uc.user.isActive,
    role: uc.role,
    isDefault: uc.isDefault,
    maxVacationDays: uc.maxVacationDays,
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
      data: userCompanies.map(mapUserCompany),
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

    return mapUserCompany(userCompany);
  }

  async update(companyId: string, userId: string, data: { maxVacationDays?: number | null }) {
    const userCompany = await this.prisma.userCompany.findFirst({
      where: { companyId, userId },
    });

    if (!userCompany) {
      throw new NotFoundException('Employee not found in this company');
    }

    const updated = await this.prisma.userCompany.update({
      where: { id: userCompany.id },
      data: {
        maxVacationDays: data.maxVacationDays ?? undefined,
      },
      include: USER_COMPANY_INCLUDE,
    });

    return mapUserCompany(updated);
  }
}
