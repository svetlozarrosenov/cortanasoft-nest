import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateHrSettingsDto } from './dto';

export const HR_SETTINGS_DEFAULTS = {
  workDayStart: '08:00',
  workDayEnd: '17:00',
  breakMinutes: 60,
};

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Стандартен работен ден на компанията. Записът се създава лениво с
 * дефолтите при първо четене, за да няма нужда от seed.
 */
@Injectable()
export class HrSettingsService {
  constructor(private prisma: PrismaService) {}

  async get(companyId: string) {
    const settings = await this.prisma.hrSettings.upsert({
      where: { companyId },
      create: { companyId },
      update: {},
    });
    return this.withDerived(settings);
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
    };
    const span = toMinutes(next.workDayEnd) - toMinutes(next.workDayStart);
    if (span <= 0) {
      throw new BadRequestException('Краят на работния ден трябва да е след началото');
    }
    if (next.breakMinutes >= span) {
      throw new BadRequestException('Почивката не може да е колкото целия работен ден');
    }
    const updated = await this.prisma.hrSettings.update({
      where: { companyId },
      data: next,
    });
    return this.withDerived(updated);
  }

  /** Часове в стандартен работен ден (напр. 8) — за „цял ден" и за дневно заплащане */
  async getWorkDayHours(companyId: string): Promise<number> {
    const s = await this.get(companyId);
    return s.workDayHours;
  }

  private withDerived<T extends { workDayStart: string; workDayEnd: string; breakMinutes: number }>(s: T) {
    const minutes = toMinutes(s.workDayEnd) - toMinutes(s.workDayStart) - s.breakMinutes;
    return { ...s, workDayMinutes: minutes, workDayHours: Math.round((minutes / 60) * 100) / 100 };
  }
}
