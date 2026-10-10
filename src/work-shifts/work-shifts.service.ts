import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, WorkShiftStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceService } from '../attendance/attendance.service';
import { HrSettingsService } from '../hr-settings/hr-settings.service';
import { CreateAttendanceDto } from '../attendance/dto/create-attendance.dto';
import { ErrorMessages } from '../common/constants/error-messages';
import {
  CopyWeekDto,
  CreateWorkShiftDto,
  QueryWorkShiftsDto,
  UpdateWorkShiftDto,
} from './dto';

const SHIFT_INCLUDE = {
  site: {
    select: {
      id: true,
      name: true,
      city: true,
      address: true,
      checklist: true,
      customer: {
        select: {
          id: true,
          companyName: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  },
} as const;

/**
 * График на смените: кой служител на кой обект, кога. Всичко е
 * companyId-скопирано; обектът и служителите се проверяват срещу фирмата.
 * Отчитането на смяна създава присъствие през AttendanceService (не пипаме
 * неговата логика — дедупликация, застъпвания, отпуски са там).
 */
@Injectable()
export class WorkShiftsService {
  private readonly logger = new Logger(WorkShiftsService.name);

  constructor(
    private prisma: PrismaService,
    private attendance: AttendanceService,
    private hrSettings: HrSettingsService,
  ) {}

  private dayKey(date: string): Date {
    return AttendanceService.dayKey(date);
  }

  private isoDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private addDays(dateKey: string, days: number): string {
    const d = this.dayKey(dateKey);
    d.setUTCDate(d.getUTCDate() + days);
    return this.isoDate(d);
  }

  /** 1 = понеделник … 7 = неделя */
  private weekday(dateKey: string): number {
    const d = this.dayKey(dateKey).getUTCDay();
    return d === 0 ? 7 : d;
  }

  private async assertSite(companyId: string, siteId: string) {
    const site = await this.prisma.site.findFirst({
      where: { id: siteId, companyId },
      select: { id: true },
    });
    if (!site) throw new NotFoundException(ErrorMessages.sites.notFound);
  }

  private async assertEmployees(companyId: string, userIds: string[]) {
    const unique = [...new Set(userIds)];
    const members = await this.prisma.userCompany.findMany({
      where: { companyId, userId: { in: unique } },
      select: { userId: true },
    });
    if (members.length !== unique.length) {
      throw new BadRequestException(
        ErrorMessages.workShifts.employeeNotInCompany,
      );
    }
    return unique;
  }

  // Нощна смяна (22:00–06:00) = краят е на следващия ден; само равни часове са грешка
  private assertTimes(startTime: string, endTime: string) {
    if (startTime === endTime) {
      throw new BadRequestException(ErrorMessages.workShifts.invalidTimes);
    }
  }

  /**
   * Почивка „от–до": или и двете, или нито една; само в дневна смяна и
   * изцяло вътре в нея (както ръчната форма в Присъствия разделя деня).
   */
  private assertBreak(
    startTime: string,
    endTime: string,
    breakStart: string | null | undefined,
    breakEnd: string | null | undefined,
  ) {
    if (!breakStart && !breakEnd) return;
    const nightShift = endTime <= startTime;
    if (
      !breakStart ||
      !breakEnd ||
      nightShift ||
      !(startTime < breakStart && breakStart < breakEnd && breakEnd < endTime)
    ) {
      throw new BadRequestException(ErrorMessages.workShifts.invalidBreak);
    }
  }

  /** Почивката по подразбиране от HR > Настройки (за формата и часовете) */
  async settings(companyId: string) {
    const s = await this.hrSettings.get(companyId);
    return { breakStart: s.breakStart, breakEnd: s.breakEnd };
  }

  /** Имената на служителите за списъка (без релация в модела) */
  private async usersById(userIds: string[]) {
    if (userIds.length === 0) return new Map<string, unknown>();
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(userIds)] } },
      select: { id: true, firstName: true, lastName: true, phone: true },
    });
    return new Map(users.map((u) => [u.id, u]));
  }

  async findAll(companyId: string, query: QueryWorkShiftsDto) {
    if (query.from > query.to) {
      throw new BadRequestException(ErrorMessages.workShifts.invalidRange);
    }
    const shifts = await this.prisma.workShift.findMany({
      where: {
        companyId,
        date: { gte: this.dayKey(query.from), lte: this.dayKey(query.to) },
        ...(query.siteId && { siteId: query.siteId }),
        ...(query.userId && { userId: query.userId }),
      },
      include: SHIFT_INCLUDE,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
    const users = await this.usersById(shifts.map((s) => s.userId));
    const leaves = await this.approvedLeaves(companyId, shifts);
    // Фактът живее в Присъствия: ако записът е изтрит оттам, смяната е
    // отново „планирана" (без да пипаме реда — Присъствия са източникът)
    const attendanceIds = shifts
      .map((s) => s.attendanceId)
      .filter((id): id is string => !!id);
    const existing = new Set(
      attendanceIds.length
        ? (
            await this.prisma.attendance.findMany({
              where: { id: { in: attendanceIds }, companyId },
              select: { id: true },
            })
          ).map((a) => a.id)
        : [],
    );
    return shifts.map((s) => ({
      ...s,
      date: this.isoDate(s.date),
      status:
        s.status === WorkShiftStatus.DONE &&
        s.attendanceId &&
        !existing.has(s.attendanceId)
          ? WorkShiftStatus.PLANNED
          : s.status,
      user: users.get(s.userId) ?? null,
      // Одобрен отпуск за деня — cron-ът не създава присъствие
      onLeave: leaves.has(`${s.userId}|${this.isoDate(s.date)}`),
    }));
  }

  /** Множество „userId|date" с одобрен отпуск за дните/хората от смените */
  private async approvedLeaves(
    companyId: string,
    shifts: { userId: string; date: Date }[],
  ): Promise<Set<string>> {
    if (shifts.length === 0) return new Set();
    const dates = shifts.map((s) => s.date.getTime());
    const leaves = await this.prisma.leave.findMany({
      where: {
        companyId,
        status: 'APPROVED',
        userId: { in: [...new Set(shifts.map((s) => s.userId))] },
        startDate: { lte: new Date(Math.max(...dates)) },
        endDate: { gte: new Date(Math.min(...dates)) },
      },
      select: { userId: true, startDate: true, endDate: true },
    });
    const set = new Set<string>();
    for (const s of shifts) {
      if (
        leaves.some(
          (l) =>
            l.userId === s.userId &&
            l.startDate <= s.date &&
            l.endDate >= s.date,
        )
      ) {
        set.add(`${s.userId}|${this.isoDate(s.date)}`);
      }
    }
    return set;
  }

  /**
   * Cron „присъствия от графика": всички планирани смени за деня стават
   * отчетени с присъствие. Отпуск → остава планирана. Грешка от Attendance
   * (напр. вече въведено ръчно присъствие, което се застъпва) → смяната
   * се прескача и се логва, нищо не се чупи.
   */
  async autoReportDay(companyId: string, dateKey: string) {
    const date = this.dayKey(dateKey);
    const planned = await this.prisma.workShift.findMany({
      where: {
        companyId,
        date,
        status: WorkShiftStatus.PLANNED,
        attendanceId: null,
      },
    });
    const leaves = await this.approvedLeaves(companyId, planned);
    const settings = await this.hrSettings.get(companyId);
    const res = { done: 0, onLeave: 0, failed: 0 };
    for (const shift of planned) {
      if (leaves.has(`${shift.userId}|${dateKey}`)) {
        res.onLeave += 1;
        continue;
      }
      try {
        // Същият път като ръчната форма в Присъствия: часове „от–до" +
        // почивка „от–до" → денят се записва като два сегмента около нея.
        // Почивката е тази на смяната, иначе — от HR настройките.
        const breakStart = shift.breakStart ?? settings.breakStart;
        const breakEnd = shift.breakEnd ?? settings.breakEnd;
        const useBreak =
          !!breakStart &&
          !!breakEnd &&
          shift.startTime < breakStart &&
          breakStart < breakEnd &&
          breakEnd < shift.endTime;
        const dto = {
          userId: shift.userId,
          date: dateKey,
          dates: [dateKey],
          siteId: shift.siteId ?? undefined,
          startTime: shift.startTime,
          endTime: shift.endTime,
          ...(useBreak && { breakStart, breakEnd }),
        } as CreateAttendanceDto;
        const created = (await this.attendance.create(
          companyId,
          shift.userId,
          dto,
        )) as { count?: number };
        if (!created?.count) {
          // Вече има ръчно въведено присъствие за деня — не го пипаме
          throw new Error(ErrorMessages.workShifts.alreadyRecorded);
        }
        // Първият сегмент на деня: „изтрит в Присъствия" = отново планирана
        const first = await this.prisma.attendance.findFirst({
          where: { companyId, userId: shift.userId, date },
          orderBy: { checkIn: 'asc' },
          select: { id: true },
        });
        await this.prisma.workShift.update({
          where: { id: shift.id },
          data: {
            status: WorkShiftStatus.DONE,
            attendanceId: first?.id ?? null,
            reportedAt: new Date(),
            reportedById: null, // null = автоматично от графика
          },
        });
        res.done += 1;
      } catch (error) {
        res.failed += 1;
        this.logger.warn(
          `Auto attendance skipped shift ${shift.id} (${companyId}): ${(error as Error).message}`,
        );
      }
    }
    return res;
  }

  /** Активните служители на фирмата — за избора в графика (без да иска hr.employees) */
  async employees(companyId: string) {
    const rows = await this.prisma.userCompany.findMany({
      where: { companyId, user: { isActive: true } },
      select: {
        user: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
        position: { select: { name: true } },
      },
      orderBy: [{ user: { firstName: 'asc' } }, { user: { lastName: 'asc' } }],
    });
    return rows.map((r) => ({ ...r.user, position: r.position?.name ?? null }));
  }

  /** Активните обекти — за избора в графика (без да иска право за Обекти) */
  async sites(companyId: string) {
    return this.prisma.site.findMany({
      where: { companyId, isActive: true },
      select: {
        id: true,
        name: true,
        city: true,
        address: true,
        checklist: true,
        customer: {
          select: {
            id: true,
            companyName: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Създава смени за всеки служител × всяка дата от серията. Дати: от `date`
   * до `repeatUntil` (вкл.), само в избраните дни от седмицата (по
   * подразбиране — денят на `date`). Дубликат (същият човек, обект, дата и
   * начален час) се прескача, за да може „повтаряй" да се пуска повторно.
   */
  async create(companyId: string, dto: CreateWorkShiftDto) {
    this.assertTimes(dto.startTime, dto.endTime);
    this.assertBreak(dto.startTime, dto.endTime, dto.breakStart, dto.breakEnd);
    if (dto.siteId) await this.assertSite(companyId, dto.siteId);
    const userIds = await this.assertEmployees(companyId, dto.userIds);

    const until = dto.repeatUntil ?? dto.date;
    if (until < dto.date) {
      throw new BadRequestException(ErrorMessages.workShifts.invalidRange);
    }
    const weekdays = new Set(
      dto.weekdays && dto.weekdays.length > 0
        ? dto.weekdays
        : [this.weekday(dto.date)],
    );
    // Ротация N/M: ден 0..N-1 работа, N..N+M-1 почивка, повтаря; иначе — дни от седмицата
    const rotation =
      dto.rotationWork && dto.rotationRest
        ? { work: dto.rotationWork, cycle: dto.rotationWork + dto.rotationRest }
        : null;
    const dates: string[] = [];
    for (
      let d = dto.date, i = 0;
      d <= until && dates.length < 400;
      d = this.addDays(d, 1), i++
    ) {
      const include = rotation
        ? i % rotation.cycle < rotation.work
        : weekdays.has(this.weekday(d));
      if (include) dates.push(d);
    }
    if (dates.length === 0) {
      throw new BadRequestException(ErrorMessages.workShifts.noDates);
    }

    const existing = await this.prisma.workShift.findMany({
      where: {
        companyId,
        siteId: dto.siteId ?? null,
        userId: { in: userIds },
        startTime: dto.startTime,
        date: {
          gte: this.dayKey(dates[0]),
          lte: this.dayKey(dates[dates.length - 1]),
        },
      },
      select: { userId: true, date: true },
    });
    const taken = new Set(
      existing.map((e) => `${e.userId}|${this.isoDate(e.date)}`),
    );

    const seriesId = dates.length > 1 ? randomUUID() : null;
    const rows: Prisma.WorkShiftCreateManyInput[] = [];
    for (const userId of userIds) {
      for (const date of dates) {
        if (taken.has(`${userId}|${date}`)) continue;
        rows.push({
          companyId,
          siteId: dto.siteId ?? null,
          userId,
          date: this.dayKey(date),
          startTime: dto.startTime,
          endTime: dto.endTime,
          breakStart: dto.breakStart ?? null,
          breakEnd: dto.breakEnd ?? null,
          note: dto.note?.trim() || null,
          seriesId,
        });
      }
    }
    if (rows.length > 0) {
      await this.prisma.workShift.createMany({ data: rows });
    }
    return {
      created: rows.length,
      skipped: userIds.length * dates.length - rows.length,
      seriesId,
    };
  }

  private async findOne(companyId: string, id: string) {
    const shift = await this.prisma.workShift.findFirst({
      where: { id, companyId },
    });
    if (!shift) throw new NotFoundException(ErrorMessages.workShifts.notFound);
    return shift;
  }

  /** Тази и следващите планирани смени от същата серия */
  private followingWhere(
    companyId: string,
    shift: { id: string; seriesId: string | null; date: Date },
  ): Prisma.WorkShiftWhereInput {
    if (!shift.seriesId) return { id: shift.id, companyId };
    return {
      companyId,
      seriesId: shift.seriesId,
      date: { gte: shift.date },
      status: WorkShiftStatus.PLANNED,
    };
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateWorkShiftDto,
    scope: 'one' | 'following' = 'one',
  ) {
    const shift = await this.findOne(companyId, id);
    if (dto.siteId) await this.assertSite(companyId, dto.siteId);
    if (dto.userId) await this.assertEmployees(companyId, [dto.userId]);
    const startTime = dto.startTime ?? shift.startTime;
    const endTime = dto.endTime ?? shift.endTime;
    this.assertTimes(startTime, endTime);
    const breakStart =
      dto.breakStart !== undefined ? dto.breakStart : shift.breakStart;
    const breakEnd = dto.breakEnd !== undefined ? dto.breakEnd : shift.breakEnd;
    this.assertBreak(startTime, endTime, breakStart, breakEnd);

    const data: Prisma.WorkShiftUpdateManyMutationInput & {
      siteId?: string | null;
      userId?: string;
    } = {
      ...(dto.siteId !== undefined && { siteId: dto.siteId }),
      ...(dto.userId && { userId: dto.userId }),
      ...(dto.startTime && { startTime: dto.startTime }),
      ...(dto.endTime && { endTime: dto.endTime }),
      ...(dto.breakStart !== undefined && { breakStart: dto.breakStart }),
      ...(dto.breakEnd !== undefined && { breakEnd: dto.breakEnd }),
      ...(dto.note !== undefined && { note: dto.note?.trim() || null }),
    };

    if (scope === 'following' && shift.seriesId) {
      // Датата не се мести на цяла серия — само на единичната смяна
      const { count } = await this.prisma.workShift.updateMany({
        where: this.followingWhere(companyId, shift),
        data,
      });
      return { updated: count };
    }
    await this.prisma.workShift.update({
      where: { id },
      data: {
        ...data,
        ...(dto.date && { date: this.dayKey(dto.date), seriesId: null }),
      },
    });
    return { updated: 1 };
  }

  async remove(
    companyId: string,
    id: string,
    scope: 'one' | 'following' = 'one',
  ) {
    const shift = await this.findOne(companyId, id);
    const where =
      scope === 'following'
        ? this.followingWhere(companyId, shift)
        : { id, companyId };
    const { count } = await this.prisma.workShift.deleteMany({ where });
    return { deleted: count };
  }

  /** Копира смените на една седмица (пон–нед) в друга като планирани; дубликатите се прескачат */
  async copyWeek(companyId: string, dto: CopyWeekDto) {
    if (this.weekday(dto.fromWeek) !== 1 || this.weekday(dto.toWeek) !== 1) {
      throw new BadRequestException(
        ErrorMessages.workShifts.weekMustStartMonday,
      );
    }
    const offset = Math.round(
      (this.dayKey(dto.toWeek).getTime() -
        this.dayKey(dto.fromWeek).getTime()) /
        86_400_000,
    );
    if (offset === 0) return { created: 0, skipped: 0 };

    const source = await this.prisma.workShift.findMany({
      where: {
        companyId,
        date: {
          gte: this.dayKey(dto.fromWeek),
          lte: this.dayKey(this.addDays(dto.fromWeek, 6)),
        },
      },
    });
    const target = await this.prisma.workShift.findMany({
      where: {
        companyId,
        date: {
          gte: this.dayKey(dto.toWeek),
          lte: this.dayKey(this.addDays(dto.toWeek, 6)),
        },
      },
      select: { userId: true, siteId: true, date: true, startTime: true },
    });
    const taken = new Set(
      target.map(
        (t) => `${t.userId}|${t.siteId}|${this.isoDate(t.date)}|${t.startTime}`,
      ),
    );
    const rows: Prisma.WorkShiftCreateManyInput[] = [];
    for (const s of source) {
      const date = this.addDays(this.isoDate(s.date), offset);
      if (taken.has(`${s.userId}|${s.siteId}|${date}|${s.startTime}`)) continue;
      rows.push({
        companyId,
        siteId: s.siteId,
        userId: s.userId,
        date: this.dayKey(date),
        startTime: s.startTime,
        endTime: s.endTime,
        breakStart: s.breakStart,
        breakEnd: s.breakEnd,
        note: s.note,
        seriesId: s.seriesId,
      });
    }
    if (rows.length > 0) await this.prisma.workShift.createMany({ data: rows });
    return { created: rows.length, skipped: source.length - rows.length };
  }
}
