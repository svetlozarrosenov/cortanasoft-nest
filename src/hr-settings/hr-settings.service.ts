import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateHrSettingsDto } from './dto';

export const HR_SETTINGS_DEFAULTS = {
  workDayStart: '08:00',
  workDayEnd: '17:00',
  breakMinutes: 60,
  leaveMaxBackdateDays: 90,
  leaveMinNoticeDays: 0,
};

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Стандартен работен ден на компанията. Записът се създава лениво с
 * дефолтите при първо четене, за да няма нужда от seed.
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
    const next = {
      workDayStart: dto.workDayStart ?? current.workDayStart,
      workDayEnd: dto.workDayEnd ?? current.workDayEnd,
      breakMinutes: dto.breakMinutes ?? current.breakMinutes,
      leaveMaxBackdateDays:
        dto.leaveMaxBackdateDays ?? current.leaveMaxBackdateDays,
      leaveMinNoticeDays: dto.leaveMinNoticeDays ?? current.leaveMinNoticeDays,
    };
    const span = toMinutes(next.workDayEnd) - toMinutes(next.workDayStart);
    if (span <= 0) {
      throw new BadRequestException(
        'Краят на работния ден трябва да е след началото',
      );
    }
    if (next.breakMinutes >= span) {
      throw new BadRequestException(
        'Почивката не може да е колкото целия работен ден',
      );
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
      breakMinutes: number;
    },
  >(s: T, annualLeaveDays: number) {
    const minutes =
      toMinutes(s.workDayEnd) - toMinutes(s.workDayStart) - s.breakMinutes;
    return {
      ...s,
      annualLeaveDays,
      workDayMinutes: minutes,
      workDayHours: Math.round((minutes / 60) * 100) / 100,
    };
  }
}
