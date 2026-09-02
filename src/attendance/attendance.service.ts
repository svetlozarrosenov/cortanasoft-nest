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

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  /**
   * Денят на присъствието се пази като UTC полунощ навсякъде (ръчно
   * създаване, период, вход/изход), за да не зависи от зоната на сървъра.
   * Клиентът подава своя локален ден (YYYY-MM-DD); без такъв — UTC днес.
   */
  static dayKey(date?: string): Date {
    const key = date || new Date().toISOString().slice(0, 10);
    return new Date(key.slice(0, 10) + 'T00:00:00.000Z');
  }

  async create(
    companyId: string,
    currentUserId: string,
    dto: CreateAttendanceDto,
  ) {
    // Няколко служители наведнъж (бригада на един обект) или един
    const targetUserIds =
      dto.userIds && dto.userIds.length > 0
        ? [...new Set(dto.userIds)]
        : [dto.userId || currentUserId];

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
    for (const userId of targetUserIds) {
      const res = await this.createForUser(companyId, userId, dto, {
        skipLeaves: true,
      });
      count += 'count' in res ? res.count : 1;
    }
    return { count, users: targetUserIds.length };
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

    // Дубликат = същият човек, ден и обект, при положение че поне единият от
    // двата записа е „цял ден" (без часове). Няколко интервала с часове на
    // същия обект са позволени (както при вход/изход) — сутрин и следобед.
    const date = AttendanceService.dayKey(dto.date);
    const existing = await this.prisma.attendance.findFirst({
      where: {
        companyId,
        userId,
        date,
        siteId: dto.siteId ?? null,
        ...(dto.checkIn ? { checkIn: null } : {}),
      },
    });

    if (existing) {
      throw new ConflictException(
        'Вече има присъствие за този ден и обект. Редактирай съществуващия запис.',
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

    // Calculate worked minutes if checkIn and checkOut are provided
    let workedMinutes: number | null = null;
    if (dto.checkIn && dto.checkOut) {
      const checkInTime = new Date(dto.checkIn);
      const checkOutTime = new Date(dto.checkOut);
      const diffMs = checkOutTime.getTime() - checkInTime.getTime();
      workedMinutes = Math.floor(diffMs / 60000) - (dto.breakMinutes || 0);
      if (workedMinutes < 0) workedMinutes = 0;
    }

    const attendance = await this.prisma.attendance.create({
      data: {
        date,
        type: dto.type,
        checkIn: dto.checkIn ? new Date(dto.checkIn) : null,
        checkOut: dto.checkOut ? new Date(dto.checkOut) : null,
        breakMinutes: dto.breakMinutes || 0,
        workedMinutes,
        overtimeMinutes: dto.overtimeMinutes || 0,
        notes: dto.notes,
        companyId,
        userId,
        siteId: dto.siteId || undefined,
      },
    });

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

    return { ...attendance, user };
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

  /** Изрично избрани дни: записът се създава за всеки подаден ден — вкл.
   *  почивни/празнични (изборът е човешки, напр. извънреден труд). Прескачат
   *  се само точните дубликати (същия ден + обект). */
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
      dateObjects = dateObjects.filter(
        (d) => !leaves.some((l) => l.startDate <= d && l.endDate >= d),
      );
    }

    const existing = await this.prisma.attendance.findMany({
      where: {
        companyId,
        userId,
        date: { in: dateObjects },
        siteId: dto.siteId ?? null,
      },
      select: { date: true },
    });
    const existingDays = new Set(
      existing.map((a) => a.date.toISOString().slice(0, 10)),
    );

    const data: Prisma.AttendanceCreateManyInput[] = dateObjects
      .filter((d) => !existingDays.has(d.toISOString().slice(0, 10)))
      .map((d) => ({
        date: d,
        type: dto.type,
        notes: dto.notes,
        companyId,
        userId,
        siteId: dto.siteId || undefined,
      }));

    await this.prisma.attendance.createMany({ data });
    return { count: data.length };
  }

  /** Календарна информация за периода — за чиповете във формата: кой ден е
   *  работен и кой е с одобрен отпуск на служителя */
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

    const leaves = await this.prisma.leave.findMany({
      where: {
        companyId,
        userId,
        status: 'APPROVED',
        startDate: { lte: to },
        endDate: { gte: from },
      },
      select: { startDate: true, endDate: true },
    });
    const onLeave = (d: Date) =>
      leaves.some((l) => l.startDate <= d && l.endDate >= d);

    const days: { date: string; isWorkingDay: boolean; onLeave: boolean }[] = [];
    for (
      let d = new Date(from);
      d <= to;
      d = new Date(d.getTime() + 86400000)
    ) {
      days.push({
        date: d.toISOString().slice(0, 10),
        isWorkingDay: isWorkingDay(d),
        onLeave: onLeave(d),
      });
    }
    return { days };
  }

  /** „От–до" вписване: по един запис на РАБОТЕН ден (КТ календара), без
   *  дните с одобрен отпуск/болничен и без вече отбелязаните за същия обект */
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
        where: {
          companyId,
          userId,
          date: { gte: from, lte: to },
          siteId: dto.siteId ?? null,
        },
        select: { date: true },
      }),
    ]);
    const existingDays = new Set(
      existing.map((a) => a.date.toISOString().slice(0, 10)),
    );
    const onLeave = (d: Date) =>
      leaves.some((l) => l.startDate <= d && l.endDate >= d);

    const data: Prisma.AttendanceCreateManyInput[] = [];
    for (
      let d = new Date(from);
      d <= to;
      d = new Date(d.getTime() + 86400000)
    ) {
      // Неработните дни се прескачат, освен при изричен избор
      // (извънреден труд в събота/празник)
      if (!dto.includeNonWorkingDays && !isWorkingDay(d)) continue;
      if (onLeave(d)) continue;
      if (existingDays.has(d.toISOString().slice(0, 10))) continue;
      data.push({
        date: new Date(d),
        type: dto.type,
        notes: dto.notes,
        companyId,
        userId,
        siteId: dto.siteId || undefined,
      });
    }

    await this.prisma.attendance.createMany({ data });
    return { count: data.length };
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

    // Calculate worked minutes if checkIn and checkOut are provided
    let workedMinutes = attendance.workedMinutes;
    const checkIn = dto.checkIn ? new Date(dto.checkIn) : attendance.checkIn;
    const checkOut = dto.checkOut
      ? new Date(dto.checkOut)
      : attendance.checkOut;
    const breakMinutes = dto.breakMinutes ?? attendance.breakMinutes;

    if (checkIn && checkOut) {
      const diffMs = checkOut.getTime() - checkIn.getTime();
      workedMinutes = Math.floor(diffMs / 60000) - breakMinutes;
      if (workedMinutes < 0) workedMinutes = 0;
    }

    const updated = await this.prisma.attendance.update({
      where: { id },
      data: {
        type: dto.type,
        checkIn: dto.checkIn ? new Date(dto.checkIn) : undefined,
        checkOut: dto.checkOut ? new Date(dto.checkOut) : undefined,
        breakMinutes: dto.breakMinutes,
        workedMinutes,
        overtimeMinutes: dto.overtimeMinutes,
        notes: dto.notes,
        // Празен string = изчистване; undefined = не се пипа
        ...(dto.siteId !== undefined && { siteId: dto.siteId || null }),
      },
    });

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

    return { ...updated, user };
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
    const diffMs = checkOut.getTime() - attendance.checkIn!.getTime();
    const workedMinutes = Math.floor(diffMs / 60000) - attendance.breakMinutes;

    const updated = await this.prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOut,
        workedMinutes: workedMinutes > 0 ? workedMinutes : 0,
      },
    });

    return updated;
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
