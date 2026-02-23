import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CompanyRole, Prisma } from '@prisma/client';
import {
  createEmptyPermissions,
  stripAdminModuleFromPermissions,
  RolePermissions,
} from '../common/config/permissions.config';

// Helper type for company assignment in DTOs
interface UserCompanyAssignmentData {
  companyId: string;
  roleId: string;
  isDefault?: boolean;
}

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ==================== Companies ====================

  async findAllCompanies() {
    return this.prisma.company.findMany({
      include: {
        currency: true,
        userCompanies: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                isActive: true,
              },
            },
            role: true,
          },
        },
        _count: {
          select: {
            userCompanies: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findCompanyById(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        country: true,
        currency: true,
        settlement: true,
        userCompanies: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                isActive: true,
              },
            },
            role: true,
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  async createCompany(dto: CreateCompanyDto) {
    // Проверка за дублиран ЕИК
    const existingEik = await this.prisma.company.findUnique({
      where: { eik: dto.eik },
    });

    if (existingEik) {
      throw new BadRequestException('Компания с този ЕИК вече съществува');
    }

    // Проверка за дублиран ДДС номер (ако е подаден)
    if (dto.vatNumber) {
      const existingVat = await this.prisma.company.findUnique({
        where: { vatNumber: dto.vatNumber },
      });

      if (existingVat) {
        throw new BadRequestException(
          'Компания с този ДДС номер вече съществува',
        );
      }
    }

    // Не позволяваме създаване на OWNER компания
    if (dto.role === CompanyRole.OWNER) {
      throw new ForbiddenException('Cannot create company with OWNER role');
    }

    return this.prisma.company.create({
      data: {
        name: dto.name,
        eik: dto.eik,
        vatNumber: dto.vatNumber,
        address: dto.address,
        city: dto.city,
        postalCode: dto.postalCode,
        countryId: dto.countryId,
        settlementId: dto.settlementId,
        molName: dto.molName,
        phone: dto.phone,
        email: dto.email,
        website: dto.website,
        bankName: dto.bankName,
        iban: dto.iban,
        bic: dto.bic,
        currencyId: dto.currencyId,
        role: dto.role || CompanyRole.CLIENT,
        isActive: dto.isActive ?? true,
      },
      include: {
        country: true,
        currency: true,
        settlement: true,
      },
    });
  }

  async updateCompany(id: string, dto: UpdateCompanyDto) {
    const company = await this.prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Не позволяваме промяна на OWNER компания към CLIENT
    if (company.role === CompanyRole.OWNER && dto.role === CompanyRole.CLIENT) {
      throw new ForbiddenException('Cannot change OWNER company to CLIENT');
    }

    // Не позволяваме промяна на CLIENT към OWNER
    if (company.role === CompanyRole.CLIENT && dto.role === CompanyRole.OWNER) {
      throw new ForbiddenException('Cannot change CLIENT company to OWNER');
    }

    // Проверка за дублиран ЕИК (ако е подаден и е различен)
    if (dto.eik && dto.eik !== company.eik) {
      const existingEik = await this.prisma.company.findUnique({
        where: { eik: dto.eik },
      });

      if (existingEik) {
        throw new BadRequestException('Компания с този ЕИК вече съществува');
      }
    }

    // Проверка за дублиран ДДС номер (ако е подаден и е различен)
    if (dto.vatNumber && dto.vatNumber !== company.vatNumber) {
      const existingVat = await this.prisma.company.findUnique({
        where: { vatNumber: dto.vatNumber },
      });

      if (existingVat) {
        throw new BadRequestException(
          'Компания с този ДДС номер вече съществува',
        );
      }
    }

    return this.prisma.company.update({
      where: { id },
      data: {
        name: dto.name,
        eik: dto.eik,
        vatNumber: dto.vatNumber,
        address: dto.address,
        city: dto.city,
        postalCode: dto.postalCode,
        countryId: dto.countryId,
        settlementId: dto.settlementId,
        molName: dto.molName,
        phone: dto.phone,
        email: dto.email,
        website: dto.website,
        bankName: dto.bankName,
        iban: dto.iban,
        bic: dto.bic,
        currencyId: dto.currencyId,
        role: dto.role,
        isActive: dto.isActive,
      },
      include: {
        country: true,
        currency: true,
        settlement: true,
      },
    });
  }

  async deleteCompany(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Не позволяваме изтриване на OWNER компания
    if (company.role === CompanyRole.OWNER) {
      throw new ForbiddenException('Cannot delete OWNER company');
    }

    return this.prisma.company.delete({
      where: { id },
    });
  }

  // ==================== Users ====================

  async findAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        userCompanies: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
                eik: true,
                role: true,
              },
            },
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        userCompanies: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
                eik: true,
                role: true,
              },
            },
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async createUser(dto: CreateUserDto) {
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingEmail) {
      throw new BadRequestException('A user with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        isActive: dto.isActive ?? true,
      },
    });

    // Добавяне на потребителя към компании
    if (dto.companies && dto.companies.length > 0) {
      await this.prisma.userCompany.createMany({
        data: dto.companies.map((c: UserCompanyAssignmentData) => ({
          userId: user.id,
          companyId: c.companyId,
          roleId: c.roleId,
          isDefault: c.isDefault ?? false,
        })),
      });
    }

    return this.findUserById(user.id);
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        userCompanies: {
          include: {
            company: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Проверка дали потребителят е в OWNER компания (platform owner)
    const isOwnerCompanyUser = user.userCompanies.some(
      (uc) => uc.company.role === 'OWNER',
    );

    // Не позволяваме деактивиране на потребител от OWNER компания
    if (isOwnerCompanyUser && dto.isActive === false) {
      throw new ForbiddenException('Cannot deactivate a platform owner user');
    }

    if (dto.email && dto.email !== user.email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (existingEmail) {
        throw new BadRequestException('A user with this email already exists');
      }
    }

    const updateData: any = {
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      isActive: dto.isActive,
    };

    if (dto.password) {
      updateData.password = await bcrypt.hash(dto.password, 10);
    }

    // Обновяване на user данните
    await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    // Обновяване на компаниите ако има промяна
    if (dto.companies) {
      // Изтриваме текущите връзки (без тези към OWNER компания ако е потребител на OWNER компания)
      if (isOwnerCompanyUser) {
        await this.prisma.userCompany.deleteMany({
          where: {
            userId: id,
            company: {
              role: 'CLIENT',
            },
          },
        });
      } else {
        await this.prisma.userCompany.deleteMany({
          where: { userId: id },
        });
      }

      // Създаваме новите връзки
      const companiesToAdd = isOwnerCompanyUser
        ? dto.companies.filter((c: UserCompanyAssignmentData) => {
            const existingOwnerCompany = user.userCompanies.find(
              (uc) => uc.company.role === 'OWNER',
            );
            return c.companyId !== existingOwnerCompany?.companyId;
          })
        : dto.companies;

      if (companiesToAdd.length > 0) {
        await this.prisma.userCompany.createMany({
          data: companiesToAdd.map((c: UserCompanyAssignmentData) => ({
            userId: id,
            companyId: c.companyId,
            roleId: c.roleId,
            isDefault: c.isDefault ?? false,
          })),
        });
      }
    }

    return this.findUserById(id);
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        userCompanies: {
          include: {
            company: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Не позволяваме изтриване на потребител от OWNER компания
    const isOwnerCompanyUser = user.userCompanies.some(
      (uc) => uc.company.role === 'OWNER',
    );
    if (isOwnerCompanyUser) {
      throw new ForbiddenException('Cannot delete a platform owner user');
    }

    return this.prisma.user.delete({
      where: { id },
    });
  }

  // ==================== Roles ====================

  async findRolesByCompany(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return this.prisma.role.findMany({
      where: { companyId },
      include: {
        _count: {
          select: {
            userCompanies: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findRoleById(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            userCompanies: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  async createRole(dto: CreateRoleDto) {
    // Проверка дали компанията съществува
    const company = await this.prisma.company.findUnique({
      where: { id: dto.companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Проверка за дублирано име на роля в компанията
    const existingRole = await this.prisma.role.findUnique({
      where: {
        companyId_name: {
          companyId: dto.companyId,
          name: dto.name,
        },
      },
    });

    if (existingRole) {
      throw new BadRequestException(
        'Роля с това име вече съществува в тази компания',
      );
    }

    // Ако не са подадени permissions, създаваме празни
    let permissions = dto.permissions || createEmptyPermissions();

    // За клиентски компании премахваме admin модула от permissions
    // Само OWNER компании могат да имат достъп до admin модула
    if (company.role === CompanyRole.CLIENT) {
      permissions = stripAdminModuleFromPermissions(permissions);
    }

    return this.prisma.role.create({
      data: {
        name: dto.name,
        description: dto.description,
        permissions: permissions as unknown as Prisma.InputJsonValue,
        isDefault: dto.isDefault ?? false,
        companyId: dto.companyId,
      },
    });
  }

  async updateRole(id: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        company: true,
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Проверка за дублирано име (ако е подадено ново име)
    if (dto.name && dto.name !== role.name) {
      const existingRole = await this.prisma.role.findUnique({
        where: {
          companyId_name: {
            companyId: role.companyId,
            name: dto.name,
          },
        },
      });

      if (existingRole) {
        throw new BadRequestException(
          'Роля с това име вече съществува в тази компания',
        );
      }
    }

    // За клиентски компании премахваме admin модула от permissions
    // Само OWNER компании могат да имат достъп до admin модула
    let permissions = dto.permissions;
    if (permissions && role.company.role === CompanyRole.CLIENT) {
      permissions = stripAdminModuleFromPermissions(permissions);
    }

    return this.prisma.role.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        permissions: permissions as unknown as Prisma.InputJsonValue,
        isDefault: dto.isDefault,
      },
    });
  }

  async deleteRole(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            userCompanies: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Проверка дали има потребители с тази роля
    if (role._count.userCompanies > 0) {
      throw new BadRequestException(
        `Не може да изтриете ролята - има ${role._count.userCompanies} потребител(и) с тази роля`,
      );
    }

    return this.prisma.role.delete({
      where: { id },
    });
  }

  // ==================== Company Users ====================

  async findUsersByCompany(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return this.prisma.userCompany.findMany({
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
          },
        },
        role: true,
      },
      orderBy: {
        user: {
          firstName: 'asc',
        },
      },
    });
  }

  async findUsersNotInCompany(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Намираме всички потребители, които НЕ са в тази компания
    return this.prisma.user.findMany({
      where: {
        userCompanies: {
          none: {
            companyId,
          },
        },
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
        userCompanies: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
              },
            },
            role: true,
          },
        },
      },
      orderBy: {
        firstName: 'asc',
      },
    });
  }

  async assignUserToCompany(
    companyId: string,
    userId: string,
    roleId: string,
    isDefault?: boolean,
  ) {
    // Проверка дали компанията съществува
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Проверка дали потребителят съществува
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Проверка дали ролята съществува и принадлежи на компанията
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role || role.companyId !== companyId) {
      throw new BadRequestException('Invalid role for this company');
    }

    // Проверка дали потребителят вече е в компанията
    const existingAssignment = await this.prisma.userCompany.findUnique({
      where: {
        userId_companyId: {
          userId,
          companyId,
        },
      },
    });

    if (existingAssignment) {
      throw new BadRequestException('User is already assigned to this company');
    }

    // Създаване на връзката
    return this.prisma.userCompany.create({
      data: {
        userId,
        companyId,
        roleId,
        isDefault: isDefault ?? false,
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
          },
        },
        role: true,
      },
    });
  }

  async removeUserFromCompany(companyId: string, userId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Не позволяваме премахване от OWNER компания
    if (company.role === 'OWNER') {
      throw new ForbiddenException(
        'Cannot remove users from platform owner company',
      );
    }

    const userCompany = await this.prisma.userCompany.findUnique({
      where: {
        userId_companyId: {
          userId,
          companyId,
        },
      },
    });

    if (!userCompany) {
      throw new NotFoundException('User is not assigned to this company');
    }

    return this.prisma.userCompany.delete({
      where: {
        userId_companyId: {
          userId,
          companyId,
        },
      },
    });
  }

  async updateUserCompanyRole(
    companyId: string,
    userId: string,
    roleId: string,
  ) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Проверка дали ролята съществува и принадлежи на компанията
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role || role.companyId !== companyId) {
      throw new BadRequestException('Invalid role for this company');
    }

    const userCompany = await this.prisma.userCompany.findUnique({
      where: {
        userId_companyId: {
          userId,
          companyId,
        },
      },
    });

    if (!userCompany) {
      throw new NotFoundException('User is not assigned to this company');
    }

    return this.prisma.userCompany.update({
      where: {
        userId_companyId: {
          userId,
          companyId,
        },
      },
      data: {
        roleId,
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
          },
        },
        role: true,
      },
    });
  }
}
