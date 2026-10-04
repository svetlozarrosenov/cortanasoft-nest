import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceService } from '../attendance/attendance.service';
import { WorkShiftsService } from './work-shifts.service';

/**
 * Присъствия от графика („negative time recording"): малко след полунощ
 * (българско време) за всяка фирма с включена настройка планираните смени
 * за ДНЕС стават отчетени и получават присъствие. Супервайзърът после пипа
 * само изключенията („не дойде", други часове). Одобрен отпуск има
 * приоритет — такава смяна остава планирана без присъствие.
 *
 * Фирми без настройката (по подразбиране всички) не се докосват изобщо.
 */
@Injectable()
export class AutoAttendanceCronService {
  private readonly logger = new Logger(AutoAttendanceCronService.name);

  constructor(
    private prisma: PrismaService,
    private shifts: WorkShiftsService,
  ) {}

  @Cron('5 0 * * *', { timeZone: 'Europe/Sofia' })
  async run() {
    await this.runForDate(AttendanceService.todayKey());
  }

  /** Отделено за тестове и за ръчно пускане; връща броячи по фирми */
  async runForDate(dateKey: string) {
    const companies = await this.prisma.hrSettings.findMany({
      where: { autoAttendanceFromSchedule: true },
      select: { companyId: true },
    });
    const totals = {
      companies: companies.length,
      done: 0,
      onLeave: 0,
      failed: 0,
    };
    for (const { companyId } of companies) {
      const res = await this.shifts.autoReportDay(companyId, dateKey);
      totals.done += res.done;
      totals.onLeave += res.onLeave;
      totals.failed += res.failed;
    }
    if (totals.companies > 0) {
      this.logger.log(
        `Auto attendance ${dateKey}: ${totals.companies} companies, ${totals.done} done, ${totals.onLeave} on leave, ${totals.failed} failed`,
      );
    }
    return totals;
  }
}
