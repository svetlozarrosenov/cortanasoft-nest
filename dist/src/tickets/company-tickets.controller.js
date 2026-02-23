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
exports.CompanyTicketsController = void 0;
const common_1 = require("@nestjs/common");
const tickets_service_1 = require("./tickets.service");
const dto_1 = require("./dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const company_access_guard_1 = require("../common/guards/company-access.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
let CompanyTicketsController = class CompanyTicketsController {
    ticketsService;
    constructor(ticketsService) {
        this.ticketsService = ticketsService;
    }
    create(companyId, req, dto) {
        return this.ticketsService.create(companyId, req.user.id, dto);
    }
    findAll(companyId, req, query) {
        return this.ticketsService.findAll(companyId, req.user.id, query);
    }
    getSummary(companyId, req) {
        return this.ticketsService.getSummary(companyId, req.user.id);
    }
    findOne(companyId, id) {
        return this.ticketsService.findOne(companyId, id);
    }
    update(companyId, id, dto) {
        return this.ticketsService.update(companyId, id, dto);
    }
    remove(companyId, id) {
        return this.ticketsService.remove(companyId, id);
    }
    startProgress(companyId, id) {
        return this.ticketsService.startProgress(companyId, id);
    }
    submitForReview(companyId, id) {
        return this.ticketsService.submitForReview(companyId, id);
    }
    complete(companyId, id) {
        return this.ticketsService.complete(companyId, id);
    }
    cancel(companyId, id) {
        return this.ticketsService.cancel(companyId, id);
    }
    assignToMe(companyId, id, req) {
        return this.ticketsService.assignToMe(companyId, id, req.user.id);
    }
    addComment(companyId, ticketId, req, dto) {
        return this.ticketsService.addComment(companyId, ticketId, req.user.id, dto);
    }
    getComments(companyId, ticketId) {
        return this.ticketsService.getComments(companyId, ticketId);
    }
    deleteComment(companyId, ticketId, commentId) {
        return this.ticketsService.deleteComment(companyId, ticketId, commentId);
    }
    addReminder(companyId, ticketId, req, dto) {
        return this.ticketsService.addReminder(companyId, ticketId, req.user.id, dto);
    }
    getReminders(companyId, ticketId) {
        return this.ticketsService.getReminders(companyId, ticketId);
    }
    deleteReminder(companyId, ticketId, reminderId) {
        return this.ticketsService.deleteReminder(companyId, ticketId, reminderId);
    }
};
exports.CompanyTicketsController = CompanyTicketsController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_guard_1.RequireCreate)('tickets', 'allTickets'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, dto_1.CreateTicketDto]),
    __metadata("design:returntype", void 0)
], CompanyTicketsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_guard_1.RequireView)('tickets', 'allTickets'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, dto_1.QueryTicketDto]),
    __metadata("design:returntype", void 0)
], CompanyTicketsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('summary'),
    (0, permissions_guard_1.RequireView)('tickets', 'allTickets'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CompanyTicketsController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_guard_1.RequireView)('tickets', 'allTickets'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyTicketsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_guard_1.RequireEdit)('tickets', 'allTickets'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.UpdateTicketDto]),
    __metadata("design:returntype", void 0)
], CompanyTicketsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_guard_1.RequireDelete)('tickets', 'allTickets'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyTicketsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/start'),
    (0, permissions_guard_1.RequireEdit)('tickets', 'allTickets'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyTicketsController.prototype, "startProgress", null);
__decorate([
    (0, common_1.Post)(':id/submit-review'),
    (0, permissions_guard_1.RequireEdit)('tickets', 'allTickets'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyTicketsController.prototype, "submitForReview", null);
__decorate([
    (0, common_1.Post)(':id/complete'),
    (0, permissions_guard_1.RequireEdit)('tickets', 'allTickets'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyTicketsController.prototype, "complete", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    (0, permissions_guard_1.RequireEdit)('tickets', 'allTickets'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyTicketsController.prototype, "cancel", null);
__decorate([
    (0, common_1.Post)(':id/assign-to-me'),
    (0, permissions_guard_1.RequireEdit)('tickets', 'allTickets'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], CompanyTicketsController.prototype, "assignToMe", null);
__decorate([
    (0, common_1.Post)(':id/comments'),
    (0, permissions_guard_1.RequireEdit)('tickets', 'allTickets'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Request)()),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, dto_1.CreateCommentDto]),
    __metadata("design:returntype", void 0)
], CompanyTicketsController.prototype, "addComment", null);
__decorate([
    (0, common_1.Get)(':id/comments'),
    (0, permissions_guard_1.RequireView)('tickets', 'allTickets'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyTicketsController.prototype, "getComments", null);
__decorate([
    (0, common_1.Delete)(':id/comments/:commentId'),
    (0, permissions_guard_1.RequireDelete)('tickets', 'allTickets'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('commentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], CompanyTicketsController.prototype, "deleteComment", null);
__decorate([
    (0, common_1.Post)(':id/reminders'),
    (0, permissions_guard_1.RequireEdit)('tickets', 'allTickets'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Request)()),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, dto_1.CreateReminderDto]),
    __metadata("design:returntype", void 0)
], CompanyTicketsController.prototype, "addReminder", null);
__decorate([
    (0, common_1.Get)(':id/reminders'),
    (0, permissions_guard_1.RequireView)('tickets', 'allTickets'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyTicketsController.prototype, "getReminders", null);
__decorate([
    (0, common_1.Delete)(':id/reminders/:reminderId'),
    (0, permissions_guard_1.RequireDelete)('tickets', 'allTickets'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('reminderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], CompanyTicketsController.prototype, "deleteReminder", null);
exports.CompanyTicketsController = CompanyTicketsController = __decorate([
    (0, common_1.Controller)('companies/:companyId/tickets'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, company_access_guard_1.CompanyAccessGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [tickets_service_1.TicketsService])
], CompanyTicketsController);
//# sourceMappingURL=company-tickets.controller.js.map