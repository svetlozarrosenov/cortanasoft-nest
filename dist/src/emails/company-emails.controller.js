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
exports.CompanyEmailsController = void 0;
const common_1 = require("@nestjs/common");
const emails_service_1 = require("./emails.service");
const dto_1 = require("./dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const company_access_guard_1 = require("../common/guards/company-access.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
let CompanyEmailsController = class CompanyEmailsController {
    emailsService;
    constructor(emailsService) {
        this.emailsService = emailsService;
    }
    create(companyId, req, createEmailDto) {
        return this.emailsService.create(companyId, req.user.id, createEmailDto);
    }
    findAll(companyId, query) {
        return this.emailsService.findAll(companyId, query);
    }
    getDirections() {
        return this.emailsService.getDirections();
    }
    getStatuses() {
        return this.emailsService.getStatuses();
    }
    getPriorities() {
        return this.emailsService.getPriorities();
    }
    getStatistics(companyId) {
        return this.emailsService.getStatistics(companyId);
    }
    getScheduledEmails(companyId, req, limit, allUsers) {
        const userId = allUsers === 'true' ? undefined : req.user.id;
        return this.emailsService.getScheduledEmails(companyId, userId, limit ? parseInt(limit) : 10);
    }
    getThread(companyId, threadId) {
        return this.emailsService.getThread(companyId, threadId);
    }
    findOne(companyId, id) {
        return this.emailsService.findOne(companyId, id);
    }
    update(companyId, id, updateEmailDto) {
        return this.emailsService.update(companyId, id, updateEmailDto);
    }
    send(companyId, id) {
        return this.emailsService.send(companyId, id);
    }
    markAsRead(companyId, id) {
        return this.emailsService.markAsRead(companyId, id);
    }
    archive(companyId, id) {
        return this.emailsService.archive(companyId, id);
    }
    remove(companyId, id) {
        return this.emailsService.remove(companyId, id);
    }
};
exports.CompanyEmailsController = CompanyEmailsController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_guard_1.RequireCreate)('crm', 'emails'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, dto_1.CreateEmailDto]),
    __metadata("design:returntype", void 0)
], CompanyEmailsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_guard_1.RequireView)('crm', 'emails'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.QueryEmailsDto]),
    __metadata("design:returntype", void 0)
], CompanyEmailsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('directions'),
    (0, permissions_guard_1.RequireView)('crm', 'emails'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CompanyEmailsController.prototype, "getDirections", null);
__decorate([
    (0, common_1.Get)('statuses'),
    (0, permissions_guard_1.RequireView)('crm', 'emails'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CompanyEmailsController.prototype, "getStatuses", null);
__decorate([
    (0, common_1.Get)('priorities'),
    (0, permissions_guard_1.RequireView)('crm', 'emails'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CompanyEmailsController.prototype, "getPriorities", null);
__decorate([
    (0, common_1.Get)('statistics'),
    (0, permissions_guard_1.RequireView)('crm', 'emails'),
    __param(0, (0, common_1.Param)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CompanyEmailsController.prototype, "getStatistics", null);
__decorate([
    (0, common_1.Get)('scheduled'),
    (0, permissions_guard_1.RequireView)('crm', 'emails'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('allUsers')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", void 0)
], CompanyEmailsController.prototype, "getScheduledEmails", null);
__decorate([
    (0, common_1.Get)('thread/:threadId'),
    (0, permissions_guard_1.RequireView)('crm', 'emails'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('threadId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyEmailsController.prototype, "getThread", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_guard_1.RequireView)('crm', 'emails'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyEmailsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_guard_1.RequireEdit)('crm', 'emails'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.UpdateEmailDto]),
    __metadata("design:returntype", void 0)
], CompanyEmailsController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/send'),
    (0, permissions_guard_1.RequireEdit)('crm', 'emails'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyEmailsController.prototype, "send", null);
__decorate([
    (0, common_1.Patch)(':id/read'),
    (0, permissions_guard_1.RequireEdit)('crm', 'emails'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyEmailsController.prototype, "markAsRead", null);
__decorate([
    (0, common_1.Patch)(':id/archive'),
    (0, permissions_guard_1.RequireEdit)('crm', 'emails'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyEmailsController.prototype, "archive", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_guard_1.RequireDelete)('crm', 'emails'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyEmailsController.prototype, "remove", null);
exports.CompanyEmailsController = CompanyEmailsController = __decorate([
    (0, common_1.Controller)('companies/:companyId/emails'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, company_access_guard_1.CompanyAccessGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [emails_service_1.EmailsService])
], CompanyEmailsController);
//# sourceMappingURL=company-emails.controller.js.map