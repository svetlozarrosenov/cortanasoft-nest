"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let AttendanceService = class AttendanceService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(companyId, currentUserId, dto) {
        const userId = dto.userId || currentUserId;
        const userCompany = await this.prisma.userCompany.findFirst({
            where: { userId, companyId },
        });
        if (!userCompany) {
            throw new common_1.BadRequestException('User is not an employee of this company');
        }
        const date = new Date(dto.date);
        const existing = await this.prisma.attendance.findUnique({
            where: {
                companyId_userId_date: {
                    companyId,
                    userId,
                    date,
                },
            },
        });
        if (existing) {
            throw new common_1.ConflictException('Attendance record already exists for this date');
        }
        let workedMinutes = null;
        if (dto.checkIn && dto.checkOut) {
            const checkInTime = new Date(dto.checkIn);
            const checkOutTime = new Date(dto.checkOut);
            const diffMs = checkOutTime.getTime() - checkInTime.getTime();
            workedMinutes = Math.floor(diffMs / 60000) - (dto.breakMinutes || 0);
            if (workedMinutes < 0)
                workedMinutes = 0;
        }
        const attendance = await this.prisma.attendance.create({
            data: {
                date,
                type: dto.type,
                status: dto.status,
                checkIn: dto.checkIn ? new Date(dto.checkIn) : null,
                checkOut: dto.checkOut ? new Date(dto.checkOut) : null,
                breakMinutes: dto.breakMinutes || 0,
                workedMinutes,
                overtimeMinutes: dto.overtimeMinutes || 0,
                notes: dto.notes,
                companyId,
                userId,
            },
        });
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
    async findAll(companyId, query) {
        const { userId, type, status, dateFrom, dateTo, page = 1, limit = 50, sortBy = 'date', sortOrder = 'desc', } = query;
        const where = { companyId };
        if (userId) {
            where.userId = userId;
        }
        if (type) {
            where.type = type;
        }
        if (status) {
            where.status = status;
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
        const [total, attendances] = await Promise.all([
            this.prisma.attendance.count({ where }),
            this.prisma.attendance.findMany({
                where,
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
        ]);
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
        const enrichedAttendances = attendances.map((a) => ({
            ...a,
            user: usersMap.get(a.userId) || null,
        }));
        return {
            data: enrichedAttendances,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findOne(companyId, id) {
        const attendance = await this.prisma.attendance.findFirst({
            where: { id, companyId },
        });
        if (!attendance) {
            throw new common_1.NotFoundException('Attendance record not found');
        }
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
        let approvedBy = null;
        if (attendance.approvedById) {
            approvedBy = await this.prisma.user.findUnique({
                where: { id: attendance.approvedById },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                },
            });
        }
        return { ...attendance, user, approvedBy };
    }
    async update(companyId, id, dto) {
        const attendance = await this.prisma.attendance.findFirst({
            where: { id, companyId },
        });
        if (!attendance) {
            throw new common_1.NotFoundException('Attendance record not found');
        }
        let workedMinutes = attendance.workedMinutes;
        const checkIn = dto.checkIn ? new Date(dto.checkIn) : attendance.checkIn;
        const checkOut = dto.checkOut
            ? new Date(dto.checkOut)
            : attendance.checkOut;
        const breakMinutes = dto.breakMinutes ?? attendance.breakMinutes;
        if (checkIn && checkOut) {
            const diffMs = checkOut.getTime() - checkIn.getTime();
            workedMinutes = Math.floor(diffMs / 60000) - breakMinutes;
            if (workedMinutes < 0)
                workedMinutes = 0;
        }
        const updated = await this.prisma.attendance.update({
            where: { id },
            data: {
                type: dto.type,
                status: dto.status,
                checkIn: dto.checkIn ? new Date(dto.checkIn) : undefined,
                checkOut: dto.checkOut ? new Date(dto.checkOut) : undefined,
                breakMinutes: dto.breakMinutes,
                workedMinutes,
                overtimeMinutes: dto.overtimeMinutes,
                notes: dto.notes,
            },
        });
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
    async approve(companyId, id, approverId) {
        const attendance = await this.prisma.attendance.findFirst({
            where: { id, companyId },
        });
        if (!attendance) {
            throw new common_1.NotFoundException('Attendance record not found');
        }
        const updated = await this.prisma.attendance.update({
            where: { id },
            data: {
                status: client_1.AttendanceStatus.APPROVED,
                approvedById: approverId,
                approvedAt: new Date(),
            },
        });
        return updated;
    }
    async reject(companyId, id, approverId) {
        const attendance = await this.prisma.attendance.findFirst({
            where: { id, companyId },
        });
        if (!attendance) {
            throw new common_1.NotFoundException('Attendance record not found');
        }
        const updated = await this.prisma.attendance.update({
            where: { id },
            data: {
                status: client_1.AttendanceStatus.REJECTED,
                approvedById: approverId,
                approvedAt: new Date(),
            },
        });
        return updated;
    }
    async remove(companyId, id) {
        const attendance = await this.prisma.attendance.findFirst({
            where: { id, companyId },
        });
        if (!attendance) {
            throw new common_1.NotFoundException('Attendance record not found');
        }
        await this.prisma.attendance.delete({
            where: { id },
        });
        return { success: true, message: 'Attendance record deleted' };
    }
    async getSummary(companyId, userId, dateFrom, dateTo) {
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
    async checkIn(companyId, userId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let attendance = await this.prisma.attendance.findUnique({
            where: {
                companyId_userId_date: {
                    companyId,
                    userId,
                    date: today,
                },
            },
        });
        if (attendance?.checkIn) {
            throw new common_1.ConflictException('Already checked in today');
        }
        if (attendance) {
            attendance = await this.prisma.attendance.update({
                where: { id: attendance.id },
                data: { checkIn: new Date() },
            });
        }
        else {
            attendance = await this.prisma.attendance.create({
                data: {
                    date: today,
                    checkIn: new Date(),
                    companyId,
                    userId,
                },
            });
        }
        return attendance;
    }
    async checkOut(companyId, userId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const attendance = await this.prisma.attendance.findUnique({
            where: {
                companyId_userId_date: {
                    companyId,
                    userId,
                    date: today,
                },
            },
        });
        if (!attendance) {
            throw new common_1.NotFoundException('No attendance record for today');
        }
        if (!attendance.checkIn) {
            throw new common_1.BadRequestException('Must check in before checking out');
        }
        if (attendance.checkOut) {
            throw new common_1.ConflictException('Already checked out today');
        }
        const checkOut = new Date();
        const diffMs = checkOut.getTime() - attendance.checkIn.getTime();
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
    async getTodayStatus(companyId, userId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const attendance = await this.prisma.attendance.findUnique({
            where: {
                companyId_userId_date: {
                    companyId,
                    userId,
                    date: today,
                },
            },
        });
        return {
            date: today,
            hasRecord: !!attendance,
            isCheckedIn: !!attendance?.checkIn,
            isCheckedOut: !!attendance?.checkOut,
            checkIn: attendance?.checkIn || null,
            checkOut: attendance?.checkOut || null,
            workedMinutes: attendance?.workedMinutes || null,
            type: attendance?.type || null,
        };
    }
};
exports.AttendanceService = AttendanceService;
exports.AttendanceService = AttendanceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AttendanceService);
//# sourceMappingURL=attendance.service.js.map