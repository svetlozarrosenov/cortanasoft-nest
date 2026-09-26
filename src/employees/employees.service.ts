import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto, LeaveEmployeeDto, UpdateEmployeeDto } from './dto';

// Домейн за генерираните имейли за вход на служители без достъп. Никой не
// праща поща дотам; сменя се от Администрация, когато се дава достъп.
const NO_ACCESS_EMAIL_DOMAIN = 'noaccess.cortanasoft.com';

function emailSlug(s: string): string {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'i',
    й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's',
    т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sht',
    ъ: 'a', ь: 'y', ю: 'yu', я: 'ya',
  };
  const out = s
    .toLowerCase()
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 20);
  return out || 'user';
}

const USER_COMPANY_INCLUDE = {
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      middleName: true,
      lastName: true,
      phone: true,
      isActive: true,
      loginEnabled: true,
      createdAt: true,
      updatedAt: true,
      // за „Напусна": тенант може да деактивира само човек, който е единствено в неговата фирма
      _count: { select: { userCompanies: true } },
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
    // Имейлът за вход се показва само на потребител с достъп; за служител без
    // достъп е генериран и няма смисъл за фирмата — тя вижда workEmail.
    email: uc.user.loginEnabled ? uc.user.email : null,
    workEmail: uc.workEmail ?? null,
    firstName: uc.user.firstName,
    middleName: uc.user.middleName ?? null,
    lastName: uc.user.lastName,
    phone: uc.user.phone ?? null,
    isActive: uc.user.isActive,
    loginEnabled: uc.user.loginEnabled,
    hireDate: uc.hireDate ?? null,
    leftAt: uc.leftAt ?? null,
    // false = човекът е и в друга фирма → напускане/връщане само през Администрация
    canDeactivate: (uc.user._count?.userCompanies ?? 1) === 1,
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

    // Лични данни (на човека, не на фирмата): фирмата ги редактира само за
    // служител без достъп. За потребител с достъп идват от Администрация.
    const personal: Prisma.UserUpdateInput = {};
    if (data.firstName !== undefined) personal.firstName = data.firstName;
    if (data.lastName !== undefined) personal.lastName = data.lastName;
    if (data.middleName !== undefined) personal.middleName = data.middleName || null;
    if (data.phone !== undefined) personal.phone = data.phone || null;
    if (Object.keys(personal).length > 0) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { loginEnabled: true },
      });
      if (user?.loginEnabled) {
        throw new BadRequestException(
          'Личните данни на потребител с достъп се редактират от Администрация',
        );
      }
      if (personal.firstName === '' || personal.lastName === '') {
        throw new BadRequestException('Името и фамилията са задължителни');
      }
      await this.prisma.user.update({ where: { id: userId }, data: personal });
    }

    if (data.workEmail) {
      await this.assertWorkEmailFree(companyId, data.workEmail, userCompany.id);
    }

    const updated = await this.prisma.userCompany.update({
      where: { id: userCompany.id },
      data: {
        // null = изчисти индивидуалната стойност → важи фирменият дефолт
        ...(data.maxVacationDays !== undefined ? { maxVacationDays: data.maxVacationDays } : {}),
        ...(data.positionId !== undefined ? { positionId: data.positionId } : {}),
        ...(data.hourlyRate !== undefined ? { hourlyRate: data.hourlyRate } : {}),
        ...(data.workEmail !== undefined ? { workEmail: data.workEmail || null } : {}),
        ...(data.hireDate !== undefined
          ? { hireDate: data.hireDate ? new Date(data.hireDate) : null }
          : {}),
      },
      include: USER_COMPANY_INCLUDE,
    });

    return mapUserCompany(updated, await this.defaultVacationDays(companyId));
  }

  /**
   * Служител без достъп: фирмата го създава сама за присъствия/заплати.
   * Имейлът за вход и паролата се генерират тук и никой не ги знае;
   * loginEnabled=false се слага тук и не се приема от клиента. Ролята е тази
   * по подразбиране на фирмата — без значение, докато няма вход; при даване
   * на достъп Администрация избира истинската.
   */
  async create(companyId: string, dto: CreateEmployeeDto) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, defaultAnnualLeaveDays: true },
    });
    if (!company) throw new NotFoundException('Company not found');

    const role =
      (await this.prisma.role.findFirst({
        where: { companyId, isDefault: true },
        select: { id: true },
      })) ??
      (await this.prisma.role.findFirst({
        where: { companyId },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      }));
    if (!role) {
      throw new BadRequestException('Фирмата няма нито една роля');
    }

    if (dto.positionId) {
      const position = await this.prisma.position.findFirst({
        where: { id: dto.positionId, companyId },
        select: { id: true },
      });
      if (!position) throw new BadRequestException('Позицията не е от тази компания');
    }

    if (dto.workEmail) {
      await this.assertWorkEmailFree(companyId, dto.workEmail);
    }

    // Парола, която никой не знае — при даване на достъп се задава нова
    const password = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
    const email = await this.generateNoAccessEmail(dto.firstName, dto.lastName);

    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password,
          firstName: dto.firstName,
          middleName: dto.middleName || null,
          lastName: dto.lastName,
          phone: dto.phone || null,
          isActive: true,
          loginEnabled: false,
        },
        select: { id: true },
      });
      return tx.userCompany.create({
        data: {
          userId: user.id,
          companyId,
          roleId: role.id,
          isDefault: true,
          positionId: dto.positionId || null,
          workEmail: dto.workEmail || null,
          hireDate: dto.hireDate ? new Date(dto.hireDate) : null,
        },
        include: USER_COMPANY_INCLUDE,
      });
    });

    return mapUserCompany(created, company.defaultAnnualLeaveDays);
  }

  /**
   * „Напусна": isActive=false (така го скриват всички екрани, както при
   * деактивиран потребител) + leftAt за информация. Само ако човекът е
   * единствено в тази фирма — isActive е глобален и тенант не бива да гаси
   * достъпа му до друга фирма.
   */
  async leave(companyId: string, userId: string, dto: LeaveEmployeeDto) {
    const userCompany = await this.requireSoleMembership(companyId, userId);
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { isActive: false } });
      await tx.trustedDevice.deleteMany({ where: { userId } });
      return tx.userCompany.update({
        where: { id: userCompany.id },
        data: { leftAt: dto.leftAt ? new Date(dto.leftAt) : new Date() },
        include: USER_COMPANY_INCLUDE,
      });
    });
    return mapUserCompany(updated, await this.defaultVacationDays(companyId));
  }

  /** „Върни на работа": обратното на leave. */
  async returnToWork(companyId: string, userId: string) {
    const userCompany = await this.requireSoleMembership(companyId, userId);
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { isActive: true } });
      return tx.userCompany.update({
        where: { id: userCompany.id },
        data: { leftAt: null },
        include: USER_COMPANY_INCLUDE,
      });
    });
    return mapUserCompany(updated, await this.defaultVacationDays(companyId));
  }

  private async requireSoleMembership(companyId: string, userId: string) {
    const userCompany = await this.prisma.userCompany.findFirst({
      where: { companyId, userId },
      select: {
        id: true,
        user: {
          select: {
            _count: { select: { userCompanies: true } },
          },
        },
      },
    });
    if (!userCompany) {
      throw new NotFoundException('Employee not found in this company');
    }
    if (userCompany.user._count.userCompanies > 1) {
      throw new BadRequestException(
        'Потребителят е и в друга фирма. Свържете се със СВ Софт.',
      );
    }
    return userCompany;
  }

  private async assertWorkEmailFree(
    companyId: string,
    workEmail: string,
    exceptUserCompanyId?: string,
  ) {
    const taken = await this.prisma.userCompany.findFirst({
      where: {
        companyId,
        workEmail,
        ...(exceptUserCompanyId ? { id: { not: exceptUserCompanyId } } : {}),
      },
      select: { id: true },
    });
    if (taken) {
      throw new ConflictException('Служебният имейл вече се използва във фирмата');
    }
  }

  private async generateNoAccessEmail(firstName: string, lastName: string) {
    const base = `${emailSlug(firstName)}.${emailSlug(lastName)}`;
    for (let i = 0; i < 5; i++) {
      const email = `${base}.${randomBytes(3).toString('hex')}@${NO_ACCESS_EMAIL_DOMAIN}`;
      const exists = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (!exists) return email;
    }
    throw new ConflictException('Не успяхме да генерираме уникален имейл');
  }

  private async defaultVacationDays(companyId: string): Promise<number> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { defaultAnnualLeaveDays: true },
    });
    return company?.defaultAnnualLeaveDays ?? 20;
  }
}
