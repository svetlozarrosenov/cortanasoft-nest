import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateHrSettingsDto } from './dto';

export const HR_SETTINGS_DEFAULTS = {
  workDayStart: '08:00',
  workDayEnd: '17:00',
  breakStart: '12:00' as string | null,
  breakEnd: '13:00' as string | null,
  hoursToleranceMinutes: 30,
  leaveMaxBackdateDays: 90,
  leaveMinNoticeDays: 0,
};

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Дължина на почивката в минути; null прозорец = без почивка */
export const breakMinutesOf = (s: {
  breakStart: string | null;
  breakEnd: string | null;
}): number =>
  s.breakStart && s.breakEnd
    ? Math.max(0, toMinutes(s.breakEnd) - toMinutes(s.breakStart))
    : 0;

/**
 * Стандартен работен ден на компанията. Записът се създава лениво с
 * дефолтите при първо четене, за да няма нужда от seed.
 *
 * Почивката е прозорец „от–до" (напр. 12:00–13:00) вътре в работния ден.
 * От него присъствията по подразбиране се създават като два интервала —
 * преди и след почивката — а дължината ѝ (breakMinutes) е изведена.
 *
 * Дните платен отпуск по подразбиране живеят в Company.defaultAnnualLeaveDays
 * (там ги чете LeavesService), но се редактират оттук — HR > Настройки е
 * единственото място за фирмени HR дефолти.
 */
@Injectable()
export class HrSettingsService {
  constructor(private prisma: PrismaService) {}

  async get(companyId: string) {
    const [settings, company] = await Promise.all([
      this.prisma.hrSettings.upsert({
        where: { companyId },
        create: { companyId },
        update: {},
      }),
      this.prisma.company.findUnique({
        where: { id: companyId },
        select: { defaultAnnualLeaveDays: true },
      }),
    ]);
    return this.withDerived(settings, company?.defaultAnnualLeaveDays ?? 20);
  }

  async update(companyId: string, dto: UpdateHrSettingsDto) {
    const current = await this.prisma.hrSettings.upsert({
      where: { companyId },
      create: { companyId },
      update: {},
    });
    // Почивката се подава като двойка: и двете зададени или и двете null
    const breakGiven =
      dto.breakStart !== undefined || dto.breakEnd !== undefined;
    const next = {
      workDayStart: dto.workDayStart ?? current.workDayStart,
      workDayEnd: dto.workDayEnd ?? current.workDayEnd,
      breakStart: breakGiven ? (dto.breakStart ?? null) : current.breakStart,
      breakEnd: breakGiven ? (dto.breakEnd ?? null) : current.breakEnd,
      hoursToleranceMinutes:
        dto.hoursToleranceMinutes ?? current.hoursToleranceMinutes,
      leaveMaxBackdateDays:
        dto.leaveMaxBackdateDays ?? current.leaveMaxBackdateDays,
      leaveMinNoticeDays: dto.leaveMinNoticeDays ?? current.leaveMinNoticeDays,
    };
    const start = toMinutes(next.workDayStart);
    const end = toMinutes(next.workDayEnd);
    if (end <= start) {
      throw new BadRequestException(
        'Краят на работния ден трябва да е след началото',
      );
    }
    if ((next.breakStart === null) !== (next.breakEnd === null)) {
      throw new BadRequestException(
        'Почивката трябва да има и начало, и край (или нито едно)',
      );
    }
    if (next.breakStart && next.breakEnd) {
      const bStart = toMinutes(next.breakStart);
      const bEnd = toMinutes(next.breakEnd);
      if (bEnd <= bStart) {
        throw new BadRequestException(
          'Краят на почивката трябва да е след началото ѝ',
        );
      }
      if (bStart <= start || bEnd >= end) {
        throw new BadRequestException(
          'Почивката трябва да е вътре в работния ден',
        );
      }
    }
    const updated = await this.prisma.hrSettings.update({
      where: { companyId },
      data: next,
    });
    if (dto.annualLeaveDays !== undefined) {
      const company = await this.prisma.company.update({
        where: { id: companyId },
        data: { defaultAnnualLeaveDays: dto.annualLeaveDays },
        select: { defaultAnnualLeaveDays: true },
      });
      return this.withDerived(updated, company.defaultAnnualLeaveDays);
    }
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { defaultAnnualLeaveDays: true },
    });
    return this.withDerived(updated, company?.defaultAnnualLeaveDays ?? 20);
  }

  /** Часове в стандартен работен ден (напр. 8) — за „цял ден" и за дневно заплащане */
  async getWorkDayHours(companyId: string): Promise<number> {
    const s = await this.get(companyId);
    return s.workDayHours;
  }

  private withDerived<
    T extends {
      workDayStart: string;
      workDayEnd: string;
      breakStart: string | null;
      breakEnd: string | null;
    },
  >(s: T, annualLeaveDays: number) {
    const breakMinutes = breakMinutesOf(s);
    const minutes =
      toMinutes(s.workDayEnd) - toMinutes(s.workDayStart) - breakMinutes;
    return {
      ...s,
      annualLeaveDays,
      breakMinutes,
      workDayMinutes: minutes,
      workDayHours: Math.round((minutes / 60) * 100) / 100,
    };
  }
}
