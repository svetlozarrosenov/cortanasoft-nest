import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string) {
    // Verify company exists
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Get all users assigned to this company
    const userCompanies = await this.prisma.userCompany.findMany({
      where: { companyId },
      include: {
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
      },
      orderBy: {
        user: {
          firstName: 'asc',
        },
      },
    });

    return {
      data: userCompanies.map((uc) => ({
        id: uc.user.id,
        email: uc.user.email,
        firstName: uc.user.firstName,
        lastName: uc.user.lastName,
        isActive: uc.user.isActive,
        role: uc.role,
        isDefault: uc.isDefault,
        createdAt: uc.user.createdAt,
        updatedAt: uc.user.updatedAt,
      })),
      meta: {
        total: userCompanies.length,
      },
    };
  }

  async findOne(companyId: string, userId: string) {
    const userCompany = await this.prisma.userCompany.findFirst({
      where: {
        companyId,
        userId,
      },
      include: {
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
      },
    });

    if (!userCompany) {
      throw new NotFoundException('Employee not found in this company');
    }

    return {
      id: userCompany.user.id,
      email: userCompany.user.email,
      firstName: userCompany.user.firstName,
      lastName: userCompany.user.lastName,
      isActive: userCompany.user.isActive,
      role: userCompany.role,
      isDefault: userCompany.isDefault,
      createdAt: userCompany.user.createdAt,
      updatedAt: userCompany.user.updatedAt,
    };
  }
}
