import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAttendanceDto,
  UpdateAttendanceDto,
  QueryAttendanceDto,
  BulkUpdateAttendanceDto,
} from './dto';
import { Prisma } from '@prisma/client';
import { isWorkingDay } from '../leaves/working-days.util';
import { HrSettingsService } from '../hr-settings/hr-settings.service';

/** Ден, пропуснат при многодневно добавяне, и защо */
export interface SkippedDay {
  date: string;
  reason: 'recorded' | 'leave';
  /** „08:00–12:00 (Люлин), 13:00–17:00 (Младост)" при reason=recorded */
  existing?: string;
}

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private hrSettings: HrSettingsService,
  ) {}

  /**
   * Денят на присъствието се пази като UTC полунощ навсякъде (ръчно
   * създаване, период, вход/изход), за да не зависи от зоната на сървъра.
   * Клиентът подава своя локален ден (YYYY-MM-DD); без такъв — UTC днес.
   */
  static dayKey(date?: string): Date {
    const key = date || new Date().toISOString().slice(0, 10);
    return new Date(key.slice(0, 10) + 'T00:00:00.000Z');
  }

  /** Днешната дата (YYYY-MM-DD) по българско време — сървърът е в UTC, а
   *  „днес" за клиентите е София */
  static todayKey(now = new Date()): string {
    return now.toLocaleDateString('en-CA', { timeZone: 'Europe/Sofia' });
  }

  /** Час от денонощието по българско време → конкретен момент (UTC) за
   *  дадения ден. Отместването се взима от Intl за самата дата, така че
   *  лятното/зимното време се отчита правилно за всеки ден от периода. */
  static sofiaTimeToDate(dateKey: string, hhmm: string): Date {
    const [y, mo, d] = dateKey.slice(0, 10).split('-').map(Number);
    const [h, mi] = hhmm.split(':').map(Number);
    const wall = Date.UTC(y, mo - 1, d, h, mi);
    // Първо приближение с отместването към „стенния" час, после проверка
    // с отместването към получения момент (около смяната на часа)
    let utc = wall - AttendanceService.sofiaOffsetMs(wall);
    utc = wall - AttendanceService.sofiaOffsetMs(utc);
    return new Date(utc);
  }

  private static readonly SOFIA_FMT = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Sofia',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  private static sofiaOffsetMs(utcMs: number): number {
    const p: Record<string, number> = {};
    for (const part of AttendanceService.SOFIA_FMT.formatToParts(
      new Date(utcMs),
    )) {
      if (part.type !== 'literal') p[part.type] = Number(part.value);
    }
    const asUtc = Date.UTC(
      p.year,
      p.month - 1,
      p.day,
      p.hour,
      p.minute,
      p.second,
    );
    return asUtc - utcMs;
  }

  /** Записите за един ден при период/избрани дни: без часове (цял ден) или
   *  с общите часове „от–до" от формата, приложени към конкретната дата.
   *  Зададена почивка „от–до" вътре в интервала разделя деня на два
   *  сегмента — преди и след нея (така се вижда реалната почивка като
   *  празнина). Излизане „преди" влизането = нощна смяна, свършва на
   *  следващия ден; тогава почивката не се прилага. */
  private dayRows(
    companyId: string,
    userId: string,
    dto: CreateAttendanceDto,
    date: Date,
    dayBreak: number,
  ): Prisma.AttendanceCreateManyInput[] {
    const row: Prisma.AttendanceCreateManyInput = {
      date,
      type: dto.type,
      notes: dto.notes,
      companyId,
      userId,
      siteId: dto.siteId || undefined,
    };
    if (!dto.startTime || !dto.endTime) return [row];

    const key = date.toISOString().slice(0, 10);
    const at = (hhmm: string) => AttendanceService.sofiaTimeToDate(key, hhmm);
    const checkIn = at(dto.startTime);
    let checkOut = at(dto.endTime);
    const nightShift = checkOut <= checkIn;
    if (nightShift) {
      checkOut = new Date(checkOut.getTime() + 24 * 60 * 60000);
    }

    if (!nightShift && dto.breakStart && dto.breakEnd) {
      const breakStart = at(dto.breakStart);
      const breakEnd = at(dto.breakEnd);
      if (
        checkIn < breakStart &&
        breakStart < breakEnd &&
        breakEnd < checkOut
      ) {
        const segment = (from: Date, to: Date) => ({
          ...row,
          checkIn: from,
          checkOut: to,
          breakMinutes: 0,
          workedMinutes: AttendanceService.spanMinutes(from, to),
        });
        return [segment(checkIn, breakStart), segment(breakEnd, checkOut)];
      }
    }

    // Дните тук са без други сегменти (иначе са прескочени), затова
    // правилото за почивката се прилага направо върху единствения интервал
    const [breakMinutes] = AttendanceService.allocateBreak(
      [{ checkIn, checkOut }],
      dayBreak,
    );
    const workedMinutes =
      AttendanceService.spanMinutes(checkIn, checkOut) - breakMinutes;
    return [{ ...row, checkIn, checkOut, breakMinutes, workedMinutes }];
  }

  /** При ≥ 6 ч работа в деня се полага почивка за хранене */
  static readonly BREAK_THRESHOLD_MINUTES = 6 * 60;

  /** Дължина на интервал в цели минути (никога отрицателна) */
  static spanMinutes(checkIn: Date, checkOut: Date): number {
    return Math.max(
      0,
      Math.floor((checkOut.getTime() - checkIn.getTime()) / 60000),
    );
  }

  /**
   * Почивката е правило на деня, не поле на сегмента: при ≥ 6 ч работа в
   * деня се приспадат `dayBreak` минути (HR > Настройки), намалени с
   * празнините между сегментите — обяд, отбелязан като дупка 12:00–13:00,
   * вече не е работно време и не се вади втори път. Приспадането ляга върху
   * най-дългия сегмент (там реално пада обядът). Връща минутите почивка за
   * всеки подаден сегмент, в същия ред.
   */
  static allocateBreak(
    segments: { checkIn: Date; checkOut: Date }[],
    dayBreak: number,
  ): number[] {
    const result = segments.map(() => 0);
    if (segments.length === 0 || dayBreak <= 0) return result;

    const order = segments
      .map((seg, i) => ({
        i,
        span: AttendanceService.spanMinutes(seg.checkIn, seg.checkOut),
      }))
      .sort(
        (a, b) =>
          segments[a.i].checkIn.getTime() - segments[b.i].checkIn.getTime(),
      );
    let total = 0;
    let gaps = 0;
    let longest = order[0];
    for (let k = 0; k < order.length; k++) {
      total += order[k].span;
      if (order[k].span > longest.span) longest = order[k];
      if (k > 0) {
        gaps += AttendanceService.spanMinutes(
          segments[order[k - 1].i].checkOut,
          segments[order[k].i].checkIn,
        );
      }
    }
    if (total < AttendanceService.BREAK_THRESHOLD_MINUTES || gaps >= dayBreak) {
      return result;
    }
    result[longest.i] = Math.min(dayBreak - gaps, longest.span);
    return result;
  }

  /**
   * Преизчислява деня след всяка промяна на сегмент: почивката по правилото
   * се разпределя наново, а workedMinutes на всеки затворен сегмент е
   * дължина − почивка. Връща новите стойности по id (за отговора).
   */
  private async normalizeDay(
    companyId: string,
    userId: string,
    date: Date,
  ): Promise<Map<string, { breakMinutes: number; workedMinutes: number }>> {
    const [settings, rows] = await Promise.all([
      this.hrSettings.get(companyId),
      this.prisma.attendance.findMany({
        where: {
          companyId,
          userId,
          date,
          checkIn: { not: null },
          checkOut: { not: null },
        },
        select: {
          id: true,
          checkIn: true,
          checkOut: true,
          breakMinutes: true,
          workedMinutes: true,
        },
      }),
    ]);
    const closed = rows.map((r) => ({
      ...r,
      checkIn: r.checkIn!,
      checkOut: r.checkOut!,
    }));
    const breaks = AttendanceService.allocateBreak(
      closed,
      settings.breakMinutes,
    );
    const result = new Map<
      string,
      { breakMinutes: number; workedMinutes: number }
    >();
    for (let i = 0; i < closed.length; i++) {
      const r = closed[i];
      const next = {
        breakMinutes: breaks[i],
        workedMinutes:
          AttendanceService.spanMinutes(r.checkIn, r.checkOut) - breaks[i],
      };
      result.set(r.id, next);
      if (
        r.breakMinutes !== next.breakMinutes ||
        r.workedMinutes !== next.workedMinutes
      ) {
        await this.prisma.attendance.update({
          where: { id: r.id },
          data: next,
        });
      }
    }
    return result;
  }

  /** „08:00" по българско време — за съобщения към потребителя */
  static sofiaTime(d: Date): string {
    return d.toLocaleTimeString('bg-BG', {
      timeZone: 'Europe/Sofia',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  /** „08:00–12:00 (Люлин)" — описание на съществуващ сегмент за съобщения */
  static describeSegment(seg: {
    checkIn: Date | null;
    checkOut: Date | null;
    site?: { name: string } | null;
  }): string {
    const hours =
      seg.checkIn && seg.checkOut
        ? `${AttendanceService.sofiaTime(seg.checkIn)}–${AttendanceService.sofiaTime(seg.checkOut)}`
        : seg.checkIn
          ? `от ${AttendanceService.sofiaTime(seg.checkIn)} (отворен)`
          : 'цял ден';
    return seg.site ? `${hours} (${seg.site.name})` : hours;
  }

  /** Може ли сегмент [checkIn, checkOut] да съжителства с вече записаните за
   *  деня: всички трябва да са с часове и да не се застъпват. */
  private assertSegmentFits(
    others: {
      checkIn: Date | null;
      checkOut: Date | null;
      site?: { name: string } | null;
    }[],
    checkIn: Date | null,
    checkOut: Date | null,
  ) {
    if (others.length === 0) return;
    const list = others.map((o) => AttendanceService.describeSegment(o));
    if (!checkIn || !checkOut) {
      throw new ConflictException(
        `Вече има присъствие за този ден (${list.join(', ')}). Втори интервал се добавя само с часове от–до.`,
      );
    }
    const openOrWholeDay = others.find((o) => !o.checkIn || !o.checkOut);
    if (openOrWholeDay) {
      throw new ConflictException(
        `Денят вече е отбелязан като ${AttendanceService.describeSegment(openOrWholeDay)}. Първо му задай часове, после добави втория интервал.`,
      );
    }
    const clash = others.find(
      (o) => checkIn < o.checkOut! && checkOut > o.checkIn!,
    );
    if (clash) {
      throw new ConflictException(
        `Часовете се застъпват с ${AttendanceService.describeSegment(clash)}.`,
      );
    }
  }

  /** Присъствието е факт, не план — не се отбелязва за бъдещ ден */
  private assertNotFuture(...dates: (string | undefined)[]) {
    const today = AttendanceService.todayKey();
    if (dates.some((d) => d && d.slice(0, 10) > today)) {
      throw new BadRequestException(
        'Присъствие не може да се отбелязва за бъдеща дата',
      );
    }
  }

  async create(
    companyId: string,
    _currentUserId: string,
    dto: CreateAttendanceDto,
  ) {
    // Няколко служители наведнъж (бригада на един обект) или един.
    // Служителят е задължителен — не се подразбира текущият потребител
    // (собственият вход/изход е през checkIn/checkOut).
    const targetUserIds =
      dto.userIds && dto.userIds.length > 0
        ? [...new Set(dto.userIds)]
        : dto.userId
          ? [dto.userId]
          : [];
    if (targetUserIds.length === 0) {
      throw new BadRequestException('Избери служител');
    }

    this.assertNotFuture(dto.date, dto.dateTo, ...(dto.dates ?? []));

    // Verify users are employees of company
    const memberships = await this.prisma.userCompany.findMany({
      where: { userId: { in: targetUserIds }, companyId },
      select: { userId: true },
    });
    if (memberships.length !== targetUserIds.length) {
      throw new BadRequestException('Служителят не е част от компанията');
    }

    // Обектът (ако е подаден) трябва да е на компанията
    if (dto.siteId) {
      const site = await this.prisma.site.findFirst({
        where: { id: dto.siteId, companyId },
        select: { id: true },
      });
      if (!site) {
        throw new BadRequestException('Обектът не е намерен');
      }
    }

    if (targetUserIds.length === 1) {
      return this.createForUser(companyId, targetUserIds[0], dto);
    }
    // Бригада: дните са избрани общо, затова за всеки човек прескачаме
    // неговите одобрени отпуски (календарът в UI-а не може да ги покаже за всички)
    let count = 0;
    let skippedCount = 0;
    for (const userId of targetUserIds) {
      const res = await this.createForUser(companyId, userId, dto, {
        skipLeaves: true,
      });
      count += 'count' in res ? res.count : 1;
      skippedCount += 'skipped' in res ? res.skipped.length : 0;
    }
    return { count, users: targetUserIds.length, skippedCount };
  }

  private async createForUser(
    companyId: string,
    userId: string,
    dto: CreateAttendanceDto,
    opts: { skipLeaves?: boolean } = {},
  ) {
    // Изрично избрани дни (календара в UI-а) — създаваме точно тях
    if (dto.dates && dto.dates.length > 0) {
      return this.createFromDates(companyId, userId, dto, opts);
    }

    // Период „от–до": разгъва се в дневни записи (само работни дни по КТ,
    // прескачат се одобрени отпуски и вече съществуващи записи за обекта)
    if (dto.dateTo) {
      return this.createRange(companyId, userId, dto);
    }

    // Ръчно вписване за един ден. Денят е поредица от времеви сегменти
    // (по един запис на обект): втори запис се допуска само ако всички са
    // с часове и не се застъпват — иначе денят си остава един запис.
    // (Вход/изход от „Моите присъствия" има собствена логика по-долу.)
    const date = AttendanceService.dayKey(dto.date);
    const existing = await this.prisma.attendance.findMany({
      where: { companyId, userId, date },
      select: {
        id: true,
        checkIn: true,
        checkOut: true,
        site: { select: { name: true } },
      },
    });

    if (existing.length > 0) {
      this.assertSegmentFits(
        existing,
        dto.checkIn ? new Date(dto.checkIn) : null,
        dto.checkOut ? new Date(dto.checkOut) : null,
      );
    }

    // Отсъствията живеят в Отпуски; ден с одобрен отпуск не може да е и
    // присъствие (при бригада/период такива дни просто се прескачат)
    const onLeave = await this.prisma.leave.findFirst({
      where: {
        companyId,
        userId,
        status: 'APPROVED',
        startDate: { lte: date },
        endDate: { gte: date },
      },
      select: { id: true },
    });
    if (onLeave) {
      throw new ConflictException(
        'За този ден има одобрен отпуск. Присъствие не може да се добави — редактирай отпуска в Отпуски.',
      );
    }

    const checkIn = dto.checkIn ? new Date(dto.checkIn) : null;
    const checkOut = dto.checkOut ? new Date(dto.checkOut) : null;
    const attendance = await this.prisma.attendance.create({
      data: {
        date,
        type: dto.type,
        checkIn,
        checkOut,
        workedMinutes:
          checkIn && checkOut
            ? AttendanceService.spanMinutes(checkIn, checkOut)
            : null,
        overtimeMinutes: dto.overtimeMinutes || 0,
        notes: dto.notes,
        companyId,
        userId,
        siteId: dto.siteId || undefined,
      },
    });
    // Почивката е правило на деня — разпределя се върху всички сегменти
    const norm = await this.normalizeDay(companyId, userId, date);

    // Get user info
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    return { ...attendance, ...norm.get(attendance.id), user };
  }

  /** Одобрени отпуски за прозорец [lower, upper] (null = без граница), най-новите първи */
  private async findApprovedLeaves(
    companyId: string,
    userId: string | undefined,
    lower: Date | null,
    upper: Date | null,
  ) {
    return this.prisma.leave.findMany({
      where: {
        companyId,
        status: 'APPROVED',
        ...(userId ? { userId } : {}),
        ...(lower ? { endDate: { gte: lower } } : {}),
        ...(upper ? { startDate: { lte: upper } } : {}),
      },
      select: {
        id: true,
        type: true,
        startDate: true,
        endDate: true,
        days: true,
        halfDay: true,
        userId: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { startDate: 'desc' },
      take: 200,
    });
  }

  /** Пропуснат ден при многодневно добавяне — за обратна връзка в UI-а:
   *  ден с вече отбелязано присъствие (с описание на сегментите) или с
   *  одобрен отпуск. Неработните дни при период не се докладват. */
  private skippedDay(
    key: string,
    reason: 'recorded' | 'leave',
    existing?: {
      checkIn: Date | null;
      checkOut: Date | null;
      site: { name: string } | null;
    }[],
  ): SkippedDay {
    return {
      date: key,
      reason,
      ...(existing && existing.length > 0
        ? {
            existing: existing
              .map((e) => AttendanceService.describeSegment(e))
              .join(', '),
          }
        : {}),
    };
  }

  /** Изрично избрани дни: записът се създава за всеки подаден ден — вкл.
   *  почивни/празнични (изборът е човешки, напр. извънреден труд). Дни, за
   *  които човекът вече има запис (на който и да е обект), се прескачат и
   *  се връщат в `skipped`, за да ги види HR. */
  private async createFromDates(
    companyId: string,
    userId: string,
    dto: CreateAttendanceDto,
    opts: { skipLeaves?: boolean } = {},
  ) {
    const dates = [...new Set(dto.dates!)].sort();
    if (dates.length > 92) {
      throw new BadRequestException('Твърде много дни наведнъж (макс. 92)');
    }
    let dateObjects = dates.map((d) => AttendanceService.dayKey(d));
    const skipped: SkippedDay[] = [];

    if (opts.skipLeaves && dateObjects.length > 0) {
      const leaves = await this.prisma.leave.findMany({
        where: {
          companyId,
          userId,
          status: 'APPROVED',
          startDate: { lte: dateObjects[dateObjects.length - 1] },
          endDate: { gte: dateObjects[0] },
        },
        select: { startDate: true, endDate: true },
      });
      dateObjects = dateObjects.filter((d) => {
        const onLeave = leaves.some((l) => l.startDate <= d && l.endDate >= d);
        if (onLeave) {
          skipped.push(this.skippedDay(d.toISOString().slice(0, 10), 'leave'));
        }
        return !onLeave;
      });
    }

    const [existingByDay, settings] = await Promise.all([
      this.existingSegmentsByDay(companyId, userId, { in: dateObjects }),
      this.hrSettings.get(companyId),
    ]);

    const data: Prisma.AttendanceCreateManyInput[] = [];
    let days = 0;
    for (const d of dateObjects) {
      const key = d.toISOString().slice(0, 10);
      const already = existingByDay.get(key);
      if (already) {
        skipped.push(this.skippedDay(key, 'recorded', already));
        continue;
      }
      data.push(
        ...this.dayRows(companyId, userId, dto, d, settings.breakMinutes),
      );
      days++;
    }

    await this.prisma.attendance.createMany({ data });
    return { count: days, skipped };
  }

  /** Сегментите на човека по ден (YYYY-MM-DD → списък) за даден филтър по дата */
  private async existingSegmentsByDay(
    companyId: string,
    userId: string,
    date: Prisma.DateTimeFilter,
  ) {
    const rows = await this.prisma.attendance.findMany({
      where: { companyId, userId, date },
      select: {
        date: true,
        checkIn: true,
        checkOut: true,
        site: { select: { name: true } },
      },
      orderBy: { checkIn: 'asc' },
    });
    const byDay = new Map<
      string,
      {
        checkIn: Date | null;
        checkOut: Date | null;
        site: { name: string } | null;
      }[]
    >();
    for (const r of rows) {
      const key = r.date.toISOString().slice(0, 10);
      const list = byDay.get(key) ?? [];
      list.push(r);
      byDay.set(key, list);
    }
    return byDay;
  }

  /** Календарна информация за периода — за календара във формата: кой ден е
   *  работен, кой е с одобрен отпуск и кой вече е с присъствие на служителя */
  async getDayInfo(
    companyId: string,
    userId: string,
    dateFrom: string,
    dateTo: string,
  ) {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || to < from) {
      throw new BadRequestException('Невалиден период');
    }
    if ((to.getTime() - from.getTime()) / 86400000 > 92) {
      throw new BadRequestException('Периодът е твърде дълъг (макс. 3 месеца)');
    }

    const [leaves, existing] = await Promise.all([
      this.prisma.leave.findMany({
        where: {
          companyId,
          userId,
          status: 'APPROVED',
          startDate: { lte: to },
          endDate: { gte: from },
        },
        select: { startDate: true, endDate: true },
      }),
      this.prisma.attendance.findMany({
        where: { companyId, userId, date: { gte: from, lte: to } },
        select: { date: true },
      }),
    ]);
    const onLeave = (d: Date) =>
      leaves.some((l) => l.startDate <= d && l.endDate >= d);
    const attendedDays = new Set(
      existing.map((a) => a.date.toISOString().slice(0, 10)),
    );

    const days: {
      date: string;
      isWorkingDay: boolean;
      onLeave: boolean;
      hasAttendance: boolean;
    }[] = [];
    for (
      let d = new Date(from);
      d <= to;
      d = new Date(d.getTime() + 86400000)
    ) {
      const key = d.toISOString().slice(0, 10);
      days.push({
        date: key,
        isWorkingDay: isWorkingDay(d),
        onLeave: onLeave(d),
        hasAttendance: attendedDays.has(key),
      });
    }
    return { days };
  }

  /** „От–до" вписване: по един запис на РАБОТЕН ден (КТ календара), без
   *  дните с одобрен отпуск/болничен и без вече отбелязаните дни */
  private async createRange(
    companyId: string,
    userId: string,
    dto: CreateAttendanceDto,
  ) {
    const from = new Date(dto.date);
    const to = new Date(dto.dateTo!);
    if (to < from) {
      throw new BadRequestException('Крайната дата е преди началната');
    }
    // Предпазител срещу случайно въведена година напред
    const MAX_DAYS = 92;
    if ((to.getTime() - from.getTime()) / 86400000 > MAX_DAYS) {
      throw new BadRequestException('Периодът е твърде дълъг (макс. 3 месеца)');
    }

    const [leaves, existingByDay, settings] = await Promise.all([
      this.prisma.leave.findMany({
        where: {
          companyId,
          userId,
          status: 'APPROVED',
          startDate: { lte: to },
          endDate: { gte: from },
        },
        select: { startDate: true, endDate: true },
      }),
      this.existingSegmentsByDay(companyId, userId, { gte: from, lte: to }),
      this.hrSettings.get(companyId),
    ]);
    const onLeave = (d: Date) =>
      leaves.some((l) => l.startDate <= d && l.endDate >= d);

    const data: Prisma.AttendanceCreateManyInput[] = [];
    const skipped: SkippedDay[] = [];
    let days = 0;
    for (
      let d = new Date(from);
      d <= to;
      d = new Date(d.getTime() + 86400000)
    ) {
      // Неработните дни се прескачат, освен при изричен избор
      // (извънреден труд в събота/празник)
      if (!dto.includeNonWorkingDays && !isWorkingDay(d)) continue;
      const key = d.toISOString().slice(0, 10);
      if (onLeave(d)) {
        skipped.push(this.skippedDay(key, 'leave'));
        continue;
      }
      const already = existingByDay.get(key);
      if (already) {
        skipped.push(this.skippedDay(key, 'recorded', already));
        continue;
      }
      data.push(
        ...this.dayRows(
          companyId,
          userId,
          dto,
          new Date(d),
          settings.breakMinutes,
        ),
      );
      days++;
    }

    await this.prisma.attendance.createMany({ data });
    return { count: days, skipped };
  }

  async findAll(companyId: string, query: QueryAttendanceDto) {
    const {
      userId,
      type,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50,
      sortBy = 'date',
      sortOrder = 'desc',
    } = query;

    const where: any = { companyId };

    if (userId) {
      where.userId = userId;
    }

    if (type) {
      where.type = type;
    }

    if (query.siteId) {
      where.siteId = query.siteId;
    }

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) {
        where.date.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.date.lte = new Date(dateTo);
      }
    }

    // Обобщението (работни/почивни дни) е за целия филтър, не за страницата
    const [total, attendances, allDates] = await Promise.all([
      this.prisma.attendance.count({ where }),
      this.prisma.attendance.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: { site: { select: { id: true, name: true } } },
      }),
      this.prisma.attendance.findMany({ where, select: { date: true } }),
    ]);
    const nonWorkingDayRecords = allDates.filter((a) => !isWorkingDay(a.date)).length;

    // Enrich with user data
    const userIds = [...new Set(attendances.map((a) => a.userId))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });

    const usersMap = new Map(users.map((u) => [u.id, u]));

    // Работа в почивен/празничен ден се извежда от календара, не се избира
    const enrichedAttendances = attendances.map((a) => ({
      ...a,
      user: usersMap.get(a.userId) || null,
      isNonWorkingDay: !isWorkingDay(a.date),
    }));

    // Одобрените отпуски се показват до присъствията само за четене (те са
    // от модул Отпуски). Прозорецът е филтърът от–до, а без такъв — обхватът
    // на текущата страница (първата гледа и напред — „кой е в отпуск сега").
    // Филтри по тип/обект се отнасят само за присъствия.
    let leaves: Awaited<ReturnType<typeof this.findApprovedLeaves>> = [];
    if (!type && !query.siteId) {
      const pageDates = attendances.map((a) => a.date.getTime());
      const lower = dateFrom
        ? new Date(dateFrom)
        : page < Math.ceil(total / limit) && pageDates.length
          ? new Date(Math.min(...pageDates))
          : null;
      const upper = dateTo
        ? new Date(dateTo)
        : page > 1 && pageDates.length
          ? new Date(Math.max(...pageDates))
          : null;
      leaves = await this.findApprovedLeaves(companyId, userId, lower, upper);
    }

    return {
      data: enrichedAttendances,
      leaves,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        workingDayRecords: total - nonWorkingDayRecords,
        nonWorkingDayRecords,
      },
    };
  }

  async findOne(companyId: string, id: string) {
    const attendance = await this.prisma.attendance.findFirst({
      where: { id, companyId },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    // Get user info
    const user = await this.prisma.user.findUnique({
      where: { id: attendance.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });

    return { ...attendance, user };
  }

  async update(companyId: string, id: string, dto: UpdateAttendanceDto) {
    const attendance = await this.prisma.attendance.findFirst({
      where: { id, companyId },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    if (dto.siteId) {
      const site = await this.prisma.site.findFirst({
        where: { id: dto.siteId, companyId },
        select: { id: true },
      });
      if (!site) {
        throw new BadRequestException('Обектът не е намерен');
      }
    }

    // Отработеното тук е бруто; почивката се приспада при преизчислението
    // на деня по-долу
    const checkIn = dto.checkIn ? new Date(dto.checkIn) : attendance.checkIn;
    const checkOut = dto.checkOut
      ? new Date(dto.checkOut)
      : attendance.checkOut;
    const workedMinutes =
      checkIn && checkOut
        ? AttendanceService.spanMinutes(checkIn, checkOut)
        : attendance.workedMinutes;

    // При няколко сегмента в деня новите часове не бива да се застъпват с
    // останалите (проверява се само ако се пипат часовете)
    if (dto.checkIn || dto.checkOut) {
      const siblings = await this.prisma.attendance.findMany({
        where: {
          companyId,
          userId: attendance.userId,
          date: attendance.date,
          id: { not: id },
        },
        select: {
          checkIn: true,
          checkOut: true,
          site: { select: { name: true } },
        },
      });
      this.assertSegmentFits(siblings, checkIn, checkOut);
    }

    const updated = await this.prisma.attendance.update({
      where: { id },
      data: {
        type: dto.type,
        checkIn: dto.checkIn ? new Date(dto.checkIn) : undefined,
        checkOut: dto.checkOut ? new Date(dto.checkOut) : undefined,
        workedMinutes,
        overtimeMinutes: dto.overtimeMinutes,
        notes: dto.notes,
        // Празен string = изчистване; undefined = не се пипа
        ...(dto.siteId !== undefined && { siteId: dto.siteId || null }),
      },
    });
    const norm = await this.normalizeDay(
      companyId,
      attendance.userId,
      attendance.date,
    );

    // Get user info
    const user = await this.prisma.user.findUnique({
      where: { id: updated.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    return { ...updated, ...norm.get(id), user };
  }

  // Масова редакция — id-та от друга компания просто не се засягат
  async bulkUpdate(companyId: string, dto: BulkUpdateAttendanceDto) {
    const site = await this.prisma.site.findFirst({
      where: { id: dto.siteId, companyId },
      select: { id: true },
    });
    if (!site) {
      throw new BadRequestException('Обектът не е намерен');
    }

    const result = await this.prisma.attendance.updateMany({
      where: { companyId, id: { in: dto.ids } },
      data: { siteId: dto.siteId },
    });

    return { updated: result.count };
  }

  async remove(companyId: string, id: string) {
    const attendance = await this.prisma.attendance.findFirst({
      where: { id, companyId },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    await this.prisma.attendance.delete({
      where: { id },
    });
    // Останалият сегмент може да поеме почивката на деня
    await this.normalizeDay(companyId, attendance.userId, attendance.date);

    return { success: true, message: 'Attendance record deleted' };
  }

  // Get summary for a user for a date range
  async getSummary(
    companyId: string,
    userId: string,
    dateFrom: string,
    dateTo: string,
  ) {
    const attendances = await this.prisma.attendance.findMany({
      where: {
        companyId,
        userId,
        date: {
          gte: new Date(dateFrom),
          lte: new Date(dateTo),
        },
      },
    });

    const summary = {
      totalDays: attendances.length,
      regularDays: 0,
      remoteDays: 0,
      halfDays: 0,
      sickLeaveDays: 0,
      vacationDays: 0,
      unpaidLeaveDays: 0,
      businessTripDays: 0,
      holidayDays: 0,
      overtimeDays: 0,
      totalWorkedMinutes: 0,
      totalOvertimeMinutes: 0,
    };

    for (const a of attendances) {
      switch (a.type) {
        case 'REGULAR':
          summary.regularDays++;
          break;
        case 'REMOTE':
          summary.remoteDays++;
          break;
        case 'HALF_DAY':
          summary.halfDays++;
          break;
        case 'SICK_LEAVE':
          summary.sickLeaveDays++;
          break;
        case 'VACATION':
          summary.vacationDays++;
          break;
        case 'UNPAID_LEAVE':
          summary.unpaidLeaveDays++;
          break;
        case 'BUSINESS_TRIP':
          summary.businessTripDays++;
          break;
        case 'HOLIDAY':
          summary.holidayDays++;
          break;
        case 'OVERTIME':
          summary.overtimeDays++;
          break;
      }

      if (a.workedMinutes) {
        summary.totalWorkedMinutes += a.workedMinutes;
      }
      summary.totalOvertimeMinutes += a.overtimeMinutes;
    }

    return summary;
  }

  // Check in for current user
  // Вход — по избор към обект. Няколко входа в един ден са позволени
  // (обект А сутрин, обект Б следобед), но само един отворен интервал.
  async checkIn(
    companyId: string,
    userId: string,
    siteId?: string,
    date?: string,
  ) {
    this.assertNotFuture(date);
    const today = AttendanceService.dayKey(date);

    if (siteId) {
      const site = await this.prisma.site.findFirst({
        where: { id: siteId, companyId },
        select: { id: true },
      });
      if (!site) {
        throw new BadRequestException('Обектът не е намерен');
      }
    }

    // Отворен интервал = вход без изход
    const open = await this.prisma.attendance.findFirst({
      where: {
        companyId,
        userId,
        date: today,
        checkIn: { not: null },
        checkOut: null,
      },
    });
    if (open) {
      throw new ConflictException('Вече има отворен вход за днес — първо отбележи изход');
    }

    // Ръчно създаден запис за деня без часове (за същия обект) — пълним него
    const blank = await this.prisma.attendance.findFirst({
      where: {
        companyId,
        userId,
        date: today,
        checkIn: null,
        siteId: siteId ?? null,
      },
    });

    if (blank) {
      return this.prisma.attendance.update({
        where: { id: blank.id },
        data: { checkIn: new Date() },
      });
    }

    return this.prisma.attendance.create({
      data: {
        date: today,
        checkIn: new Date(),
        companyId,
        userId,
        siteId: siteId || undefined,
      },
    });
  }

  // Check out for current user — затваря отворения интервал за деня
  async checkOut(companyId: string, userId: string, date?: string) {
    const today = AttendanceService.dayKey(date);

    const attendance = await this.prisma.attendance.findFirst({
      where: {
        companyId,
        userId,
        date: today,
        checkIn: { not: null },
        checkOut: null,
      },
      orderBy: { checkIn: 'desc' },
    });

    if (!attendance) {
      const anyToday = await this.prisma.attendance.findFirst({
        where: { companyId, userId, date: today },
      });
      if (!anyToday) {
        throw new NotFoundException('Няма присъствие за днес');
      }
      if (!anyToday.checkIn) {
        throw new BadRequestException('Първо отбележи вход');
      }
      throw new ConflictException('Изходът за днес вече е отбелязан');
    }

    const checkOut = new Date();
    const updated = await this.prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOut,
        workedMinutes: AttendanceService.spanMinutes(
          attendance.checkIn!,
          checkOut,
        ),
      },
    });
    // Почивката по правилото на деня (обядът при 8-часов ден и т.н.)
    const norm = await this.normalizeDay(companyId, userId, today);

    return { ...updated, ...norm.get(updated.id) };
  }

  // Get today's status for current user. При няколко записа в деня (два
  // обекта) статусът гледа последния интервал, а минутите са сумарни.
  async getTodayStatus(companyId: string, userId: string, date?: string) {
    const today = AttendanceService.dayKey(date);

    const records = await this.prisma.attendance.findMany({
      where: { companyId, userId, date: today },
      orderBy: { checkIn: 'asc' },
      include: { site: { select: { id: true, name: true } } },
    });
    const latest = records[records.length - 1] || null;
    const hasOpen = records.some((r) => r.checkIn && !r.checkOut);
    const totalMinutes = records.reduce(
      (sum, r) => sum + (r.workedMinutes || 0),
      0,
    );

    return {
      date: today,
      hasRecord: records.length > 0,
      isCheckedIn: hasOpen || (!!latest?.checkIn && !latest?.checkOut),
      isCheckedOut: records.length > 0 && !hasOpen && !!latest?.checkOut,
      checkIn: latest?.checkIn || null,
      checkOut: latest?.checkOut || null,
      workedMinutes: totalMinutes || null,
      type: latest?.type || null,
      site: latest?.site || null,
      // Всички интервали за деня (обект А сутрин, обект Б следобед)
      records: records.map((r) => ({
        id: r.id,
        site: r.site,
        checkIn: r.checkIn,
        checkOut: r.checkOut,
        workedMinutes: r.workedMinutes,
      })),
    };
  }

  /**
   * Кой е „вътре" в момента: отворени интервали (вход без изход) за деня,
   * групирани по обект — за дъската „Сега на обектите".
   */
  // Активни обекти (id + име) за селекта при Вход / ръчен запис
  findSiteOptions(companyId: string) {
    return this.prisma.site.findMany({
      where: { companyId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Месечна матрица „служители × дни": за всеки служител на фирмата —
   * клетка на ден с отработени минути, обект(и) и одобрен отпуск, плюс
   * суми. Това е основният изглед на Присъствие; таблицата със записи е
   * за корекции.
   */
  async getMonthOverview(
    companyId: string,
    month: string,
    userId?: string,
    siteId?: string,
    // Локалният ден на клиента (YYYY-MM-DD); „липсва" се брои само до него
    today?: string,
  ) {
    const m = /^(\d{4})-(\d{2})$/.exec(month || '');
    if (!m) {
      throw new BadRequestException('Невалиден месец (очаква се YYYY-MM)');
    }
    const year = Number(m[1]);
    const mon = Number(m[2]);
    if (mon < 1 || mon > 12) {
      throw new BadRequestException('Невалиден месец (очаква се YYYY-MM)');
    }
    const from = new Date(Date.UTC(year, mon - 1, 1));
    const to = new Date(Date.UTC(year, mon, 0));

    const [members, attendances, leaves, settings, payrolls] = await Promise.all([
      this.prisma.userCompany.findMany({
        where: { companyId, ...(userId ? { userId } : {}) },
        select: {
          hourlyRate: true,
          position: { select: { name: true, hourlyRate: true } },
          user: {
            select: { id: true, firstName: true, lastName: true, isActive: true },
          },
        },
        orderBy: { user: { firstName: 'asc' } },
      }),
      this.prisma.attendance.findMany({
        where: {
          companyId,
          date: { gte: from, lte: to },
          ...(userId ? { userId } : {}),
          ...(siteId ? { siteId } : {}),
        },
        select: {
          id: true,
          userId: true,
          date: true,
          checkIn: true,
          checkOut: true,
          workedMinutes: true,
          siteId: true,
          site: { select: { name: true } },
        },
        orderBy: { checkIn: 'asc' },
      }),
      this.prisma.leave.findMany({
        where: {
          companyId,
          status: 'APPROVED',
          ...(userId ? { userId } : {}),
          startDate: { lte: to },
          endDate: { gte: from },
        },
        select: { userId: true, type: true, startDate: true, endDate: true, halfDay: true },
      }),
      // Часове в работен ден (дневна ставка = ставка/час × тях) + толеранса
      // за недостиг на часове
      this.hrSettings.get(companyId),
      // Ведомост за месеца (една на човек) — за маркера „платено" пред името
      this.prisma.payroll.findMany({
        where: {
          companyId,
          year,
          month: mon,
          status: { not: 'CANCELLED' },
          ...(userId ? { userId } : {}),
        },
        select: { id: true, userId: true, status: true, netSalary: true, paidAt: true },
      }),
    ]);
    const payrollByUser = new Map(payrolls.map((p) => [p.userId, p]));
    const workDayHours = settings.workDayHours;
    const toleranceMinutes = settings.hoursToleranceMinutes;

    const days: { date: string; isWorkingDay: boolean }[] = [];
    for (let d = new Date(from); d <= to; d = new Date(d.getTime() + 86400000)) {
      days.push({ date: d.toISOString().slice(0, 10), isWorkingDay: isWorkingDay(d) });
    }
    const workingDays = days.filter((d) => d.isWorkingDay).length;
    const todayKey = AttendanceService.dayKey(today).toISOString().slice(0, 10);

    type Cell = {
      minutes: number;
      // Има вход без изход — денят още тече
      open: boolean;
      records: {
        id: string;
        siteId: string | null;
        siteName: string | null;
        checkIn: Date | null;
        checkOut: Date | null;
        workedMinutes: number | null;
      }[];
      leave: string | null;
      halfDay: boolean;
    };
    const emptyCell = (): Cell => ({ minutes: 0, open: false, records: [], leave: null, halfDay: false });

    const byUser = new Map<string, Record<string, Cell>>();
    const cellFor = (uid: string, date: string) => {
      let cells = byUser.get(uid);
      if (!cells) {
        cells = {};
        byUser.set(uid, cells);
      }
      return (cells[date] ??= emptyCell());
    };

    for (const a of attendances) {
      const cell = cellFor(a.userId, a.date.toISOString().slice(0, 10));
      cell.records.push({
        id: a.id,
        siteId: a.siteId,
        siteName: a.site?.name ?? null,
        checkIn: a.checkIn,
        checkOut: a.checkOut,
        workedMinutes: a.workedMinutes,
      });
      cell.minutes += a.workedMinutes ?? 0;
      if (a.checkIn && !a.checkOut) cell.open = true;
    }
    for (const l of leaves) {
      for (const d of days) {
        const dd = new Date(d.date);
        if (l.startDate <= dd && l.endDate >= dd) {
          const cell = cellFor(l.userId, d.date);
          cell.leave = l.type;
          cell.halfDay = l.halfDay;
        }
      }
    }

    // Служители на фирмата + (при филтър по обект) само тези с присъствие там
    const employees = members
      .map((mem) => {
        const cells = byUser.get(mem.user.id) ?? {};
        const presentDays = Object.values(cells).filter((c) => c.records.length > 0).length;
        const minutes = Object.values(cells).reduce((sum, c) => sum + c.minutes, 0);
        const leaveDays = Object.values(cells).reduce(
          (sum, c) => sum + (c.leave ? (c.halfDay ? 0.5 : 1) : 0),
          0,
        );
        // Работни дни (до днес) без запис и без отпуск — „липсва"
        const missingDays = days.filter(
          (d) =>
            d.isWorkingDay &&
            d.date <= todayKey &&
            !(cells[d.date]?.records.length || cells[d.date]?.leave),
        ).length;
        // Колко часа се очакват до днес: работните дни минус отпуските
        // (те са „платени" и не се отработват). Ден с отворен интервал още
        // тече — не се очаква, за да не свети червено на човек на работа.
        const expectedDays = days.reduce((sum, d) => {
          if (!d.isWorkingDay || d.date > todayKey) return sum;
          const cell = cells[d.date];
          if (cell?.open) return sum;
          const onLeave = cell?.leave ? (cell.halfDay ? 0.5 : 1) : 0;
          return sum + (1 - onLeave);
        }, 0);
        const expectedMinutes = Math.round(expectedDays * workDayHours * 60);
        const diffMinutes = minutes - expectedMinutes;
        // Ефективна ставка на час: личната, иначе тази на позицията
        const rate = mem.hourlyRate ?? mem.position?.hourlyRate ?? null;
        const payroll = payrollByUser.get(mem.user.id);
        return {
          id: mem.user.id,
          firstName: mem.user.firstName,
          lastName: mem.user.lastName,
          isActive: mem.user.isActive,
          position: mem.position?.name ?? null,
          hourlyRate: rate != null ? Number(rate) : null,
          payroll: payroll
            ? { id: payroll.id, status: payroll.status, netSalary: Number(payroll.netSalary), paidAt: payroll.paidAt }
            : null,
          cells,
          totals: {
            presentDays,
            minutes,
            leaveDays,
            missingDays,
            expectedMinutes,
            diffMinutes,
            // Недостиг над толеранса от HR > Настройки
            short: diffMinutes < -toleranceMinutes,
          },
        };
      })
      .filter((e) => !siteId || e.totals.presentDays > 0);

    return {
      month,
      today: todayKey,
      days,
      workingDays,
      workDayHours,
      toleranceMinutes,
      employees,
    };
  }

  async findOpenIntervals(companyId: string, date?: string) {
    const today = AttendanceService.dayKey(date);
    const open = await this.prisma.attendance.findMany({
      where: {
        companyId,
        date: today,
        checkIn: { not: null },
        checkOut: null,
      },
      include: { site: { select: { id: true, name: true } } },
      orderBy: { checkIn: 'asc' },
    });
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(open.map((r) => r.userId))] } },
      select: { id: true, firstName: true, lastName: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));
    return open.map((r) => ({
      id: r.id,
      userId: r.userId,
      firstName: userMap.get(r.userId)?.firstName ?? '',
      lastName: userMap.get(r.userId)?.lastName ?? '',
      site: r.site,
      checkIn: r.checkIn,
    }));
  }
}
