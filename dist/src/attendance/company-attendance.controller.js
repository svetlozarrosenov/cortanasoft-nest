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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyAttendanceController = void 0;
const common_1 = require("@nestjs/common");
const attendance_service_1 = require("./attendance.service");
const dto_1 = require("./dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const company_access_guard_1 = require("../common/guards/company-access.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const export_service_1 = require("../common/export/export.service");
let CompanyAttendanceController = class CompanyAttendanceController {
    attendanceService;
    exportService;
    constructor(attendanceService, exportService) {
        this.attendanceService = attendanceService;
        this.exportService = exportService;
    }
    create(companyId, req, dto) {
        return this.attendanceService.create(companyId, req.user.id, dto);
    }
    findAll(companyId, query) {
        return this.attendanceService.findAll(companyId, query);
    }
    getTodayStatus(companyId, req) {
        return this.attendanceService.getTodayStatus(companyId, req.user.id);
    }
    getSummary(companyId, userId, dateFrom, dateTo) {
        return this.attendanceService.getSummary(companyId, userId, dateFrom, dateTo);
    }
    async export(companyId, query, format = 'xlsx', res) {
        const { data } = await this.attendanceService.findAll(companyId, { ...query, page: 1, limit: 100000 });
        const columns = [
            { header: 'First Name', key: 'user.firstName', width: 20 },
            { header: 'Last Name', key: 'user.lastName', width: 20 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Type', key: 'type', width: 12 },
            { header: 'Check In', key: 'checkIn', width: 20 },
            { header: 'Check Out', key: 'checkOut', width: 20 },
            { header: 'Worked Minutes', key: 'workedMinutes', width: 15 },
            { header: 'Overtime Minutes', key: 'overtimeMinutes', width: 15 },
            { header: 'Status', key: 'status', width: 12 },
        ];
        const buffer = await this.exportService.generateFile(columns, data, format, 'Attendance');
        const ext = format === 'csv' ? 'csv' : 'xlsx';
        res.set({
            'Content-Type': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="attendance-${new Date().toISOString().slice(0, 10)}.${ext}"`,
        });
        return new common_1.StreamableFile(buffer);
    }
    findOne(companyId, id) {
        return this.attendanceService.findOne(companyId, id);
    }
    update(companyId, id, dto) {
        return this.attendanceService.update(companyId, id, dto);
    }
    remove(companyId, id) {
        return this.attendanceService.remove(companyId, id);
    }
    checkIn(companyId, req) {
        return this.attendanceService.checkIn(companyId, req.user.id);
    }
    checkOut(companyId, req) {
        return this.attendanceService.checkOut(companyId, req.user.id);
    }
    approve(companyId, id, req) {
        return this.attendanceService.approve(companyId, id, req.user.id);
    }
    reject(companyId, id, req) {
        return this.attendanceService.reject(companyId, id, req.user.id);
    }
};
exports.CompanyAttendanceController = CompanyAttendanceController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_guard_1.RequireCreate)('hr', 'attendance'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, dto_1.CreateAttendanceDto]),
    __metadata("design:returntype", void 0)
], CompanyAttendanceController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_guard_1.RequireView)('hr', 'attendance'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.QueryAttendanceDto]),
    __metadata("design:returntype", void 0)
], CompanyAttendanceController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('today'),
    (0, permissions_guard_1.RequireView)('hr', 'attendance'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CompanyAttendanceController.prototype, "getTodayStatus", null);
__decorate([
    (0, common_1.Get)('summary'),
    (0, permissions_guard_1.RequireView)('hr', 'attendance'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)('userId')),
    __param(2, (0, common_1.Query)('dateFrom')),
    __param(3, (0, common_1.Query)('dateTo')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], CompanyAttendanceController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)('export'),
    (0, permissions_guard_1.RequireView)('hr', 'attendance'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Query)('format')),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.QueryAttendanceDto, String, Object]),
    __metadata("design:returntype", Promise)
], CompanyAttendanceController.prototype, "export", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_guard_1.RequireView)('hr', 'attendance'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyAttendanceController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_guard_1.RequireEdit)('hr', 'attendance'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.UpdateAttendanceDto]),
    __metadata("design:returntype", void 0)
], CompanyAttendanceController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_guard_1.RequireDelete)('hr', 'attendance'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyAttendanceController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('check-in'),
    (0, permissions_guard_1.RequireCreate)('hr', 'attendance'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CompanyAttendanceController.prototype, "checkIn", null);
__decorate([
    (0, common_1.Post)('check-out'),
    (0, permissions_guard_1.RequireEdit)('hr', 'attendance'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CompanyAttendanceController.prototype, "checkOut", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    (0, permissions_guard_1.RequireEdit)('hr', 'attendance'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], CompanyAttendanceController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)(':id/reject'),
    (0, permissions_guard_1.RequireEdit)('hr', 'attendance'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], CompanyAttendanceController.prototype, "reject", null);
exports.CompanyAttendanceController = CompanyAttendanceController = __decorate([
    (0, common_1.Controller)('companies/:companyId/attendance'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, company_access_guard_1.CompanyAccessGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [attendance_service_1.AttendanceService,
        export_service_1.ExportService])
], CompanyAttendanceController);
//# sourceMappingURL=company-attendance.controller.js.map