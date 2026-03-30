import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { parse } from 'csv-parse/sync';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
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

    // Не позволяваме изтриване на потребител, който е асоцииран с компания
    if (user.userCompanies.length > 0) {
      const companyNames = user.userCompanies.map((uc) => uc.company.name).join(', ');
      throw new ForbiddenException(
        `Потребителят е асоцииран с компании: ${companyNames}. Първо го премахнете от всички компании.`,
      );
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

  // ==================== API Keys ====================

  async findApiKeysByCompany(companyId: string) {
    return this.prisma.apiKey.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createApiKey(companyId: string, dto: CreateApiKeyDto) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Generate: cs_live_ + 40 random hex chars
    const rawKey = 'cs_live_' + crypto.randomBytes(20).toString('hex');
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const prefix = rawKey.substring(0, 14);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        name: dto.name,
        keyHash,
        prefix,
        companyId,
      },
    });

    return { apiKey, rawKey };
  }

  async deleteApiKey(companyId: string, apiKeyId: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id: apiKeyId, companyId },
    });
    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    await this.prisma.apiKey.delete({ where: { id: apiKeyId } });
  }

  // ==================== Welcome Email ====================

  async prepareWelcomeEmail(
    companyId: string,
    userId: string,
    providedPassword?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Get the user's role in this company
    const userCompany = await this.prisma.userCompany.findUnique({
      where: {
        userId_companyId: {
          userId,
          companyId,
        },
      },
      include: {
        role: true,
      },
    });

    const roleName = userCompany?.role?.name || 'Потребител';

    // Generate or use provided password
    const password =
      providedPassword || crypto.randomBytes(9).toString('base64').slice(0, 12);
    const wasGenerated = !providedPassword;

    // Hash and update the user's password
    const hashedPassword = await bcrypt.hash(password, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return {
      user,
      company,
      roleName,
      password,
      wasGenerated,
    };
  }

  // ==================== WooCommerce Import ====================

  async importWooCommerceProducts(
    companyId: string,
    fileBuffer: Buffer,
    userId: string,
  ) {
    // Verify company exists
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, vatNumber: true, currencyId: true },
    });
    if (!company) {
      throw new NotFoundException('Компанията не е намерена');
    }

    // Parse CSV
    let records: Record<string, string>[];
    try {
      records = parse(fileBuffer, {
        columns: true,
        skip_empty_lines: true,
        bom: true,
        relax_column_count: true,
      });
    } catch {
      throw new BadRequestException('Невалиден CSV файл');
    }

    if (records.length === 0) {
      throw new BadRequestException('CSV файлът е празен');
    }

    // Get existing SKUs for this company
    const existingProducts = await this.prisma.product.findMany({
      where: { companyId },
      select: { sku: true },
    });
    const existingSkus = new Set(existingProducts.map((p) => p.sku));

    // Get existing categories for this company (with parentId for hierarchy)
    const existingCategories = await this.prisma.productCategory.findMany({
      where: { companyId },
      select: { id: true, name: true, parentId: true },
    });
    // Map: "parentId|lowercaseName" → id (for hierarchy lookup)
    const categoryMap = new Map<string, string>();
    for (const c of existingCategories) {
      categoryMap.set(`${c.parentId || ''}|${c.name.toLowerCase()}`, c.id);
    }

    // Default VAT rate
    const defaultVatRate = company.vatNumber ? 20 : 0;

    // Process in chunks
    const CHUNK_SIZE = 50;
    let created = 0;
    let skipped = 0;
    let errors: string[] = [];

    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
      const chunk = records.slice(i, i + CHUNK_SIZE);
      const productsToCreate: Prisma.ProductCreateManyInput[] = [];

      for (const row of chunk) {
        // WooCommerce CSV columns mapping
        const sku = (row['SKU'] || '').trim();
        const name = (row['Name'] || '').trim();
        const regularPrice = row['Regular price'] || row['Sale price'] || '';
        const description = (row['Description'] || row['Short description'] || '').trim();
        const weight = row['Weight (kg)'] || row['Weight (lbs)'] || '';
        const length = row['Length (cm)'] || row['Length (in)'] || '';
        const width = row['Width (cm)'] || row['Width (in)'] || '';
        const height = row['Height (cm)'] || row['Height (in)'] || '';
        const stock = row['Stock'] || '';
        const lowStock = row['Low stock amount'] || '';
        const manageStock = row['Manage stock?'] || '';
        const published = row['Published'] || '';
        const categories = (row['Categories'] || '').trim();
        const type = (row['Type'] || '').trim().toLowerCase();

        // Skip variable product parent rows and variations without SKU
        if (!name && !sku) {
          skipped++;
          continue;
        }

        // Generate SKU if missing
        const finalSku = sku || `WC-${i + chunk.indexOf(row) + 1}-${Date.now()}`;

        if (existingSkus.has(finalSku)) {
          skipped++;
          continue;
        }

        // Parse price
        const salePrice = parseFloat(regularPrice) || 0;

        if (!name) {
          errors.push(`Ред ${i + chunk.indexOf(row) + 2}: Липсва име на продукт`);
          continue;
        }

        // Resolve category hierarchy from WooCommerce "Parent > Child > Grandchild, OtherCat" format
        let categoryId: string | null = null;
        if (categories) {
          // Take the first category path (before comma)
          const firstCategoryPath = categories.split(',')[0].trim();
          const parts = firstCategoryPath.split('>').map((p) => p.trim()).filter(Boolean);

          let parentId: string | null = null;
          for (const catName of parts) {
            const key = `${parentId || ''}|${catName.toLowerCase()}`;
            if (categoryMap.has(key)) {
              parentId = categoryMap.get(key)!;
            } else {
              // Create the category with parent
              const newCat = await this.prisma.productCategory.create({
                data: {
                  name: catName,
                  companyId,
                  parentId,
                },
              });
              categoryMap.set(key, newCat.id);
              parentId = newCat.id;
            }
          }
          categoryId = parentId;
        }

        // Skip WooCommerce "variable" parent rows (they have no price usually)
        if (type === 'variable') {
          skipped++;
          continue;
        }

        productsToCreate.push({
          sku: finalSku,
          name,
          description: description || null,
          salePrice: salePrice,
          purchasePrice: null,
          vatRate: defaultVatRate,
          weight: parseFloat(weight) || null,
          dimensionsL: parseFloat(length) || null,
          dimensionsW: parseFloat(width) || null,
          dimensionsH: parseFloat(height) || null,
          minStock: parseFloat(lowStock) || null,
          trackInventory: manageStock === '1' || manageStock.toLowerCase() === 'yes',
          isActive: published !== '0' && published.toLowerCase() !== 'no',
          type: 'PRODUCT',
          unit: 'PIECE',
          companyId,
          createdById: userId,
          categoryId,
          purchaseCurrencyId: company.currencyId,
          saleCurrencyId: company.currencyId,
        });

        existingSkus.add(finalSku);
      }

      if (productsToCreate.length > 0) {
        const result = await this.prisma.product.createMany({
          data: productsToCreate,
          skipDuplicates: true,
        });
        created += result.count;
      }
    }

    return {
      total: records.length,
      created,
      skipped,
      errors: errors.slice(0, 20), // Limit error messages
    };
  }
}
