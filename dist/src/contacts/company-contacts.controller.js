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
exports.CompanyContactsController = void 0;
const common_1 = require("@nestjs/common");
const contacts_service_1 = require("./contacts.service");
const dto_1 = require("./dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const company_access_guard_1 = require("../common/guards/company-access.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const export_service_1 = require("../common/export/export.service");
let CompanyContactsController = class CompanyContactsController {
    contactsService;
    exportService;
    constructor(contactsService, exportService) {
        this.contactsService = contactsService;
        this.exportService = exportService;
    }
    create(companyId, dto) {
        return this.contactsService.create(companyId, dto);
    }
    findAll(companyId, query) {
        return this.contactsService.findAll(companyId, query);
    }
    async export(companyId, query, format = 'xlsx', res) {
        const { data } = await this.contactsService.findAll(companyId, { ...query, page: 1, limit: 100000 });
        const columns = [
            { header: 'First Name', key: 'firstName', width: 20 },
            { header: 'Last Name', key: 'lastName', width: 20 },
            { header: 'Email', key: 'email', width: 25 },
            { header: 'Phone', key: 'phone', width: 15 },
            { header: 'Position', key: 'position', width: 20 },
            { header: 'Company', key: 'customer.companyName', width: 25 },
        ];
        const buffer = await this.exportService.generateFile(columns, data, format, 'Contacts');
        const ext = format === 'csv' ? 'csv' : 'xlsx';
        res.set({
            'Content-Type': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="contacts-${new Date().toISOString().slice(0, 10)}.${ext}"`,
        });
        return new common_1.StreamableFile(buffer);
    }
    findByCustomer(companyId, customerId) {
        return this.contactsService.findByCustomer(companyId, customerId);
    }
    findOne(companyId, id) {
        return this.contactsService.findOne(companyId, id);
    }
    update(companyId, id, dto) {
        return this.contactsService.update(companyId, id, dto);
    }
    remove(companyId, id) {
        return this.contactsService.remove(companyId, id);
    }
    setAsPrimary(companyId, id) {
        return this.contactsService.setAsPrimary(companyId, id);
    }
};
exports.CompanyContactsController = CompanyContactsController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_guard_1.RequireCreate)('crm', 'contacts'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.CreateContactDto]),
    __metadata("design:returntype", void 0)
], CompanyContactsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_guard_1.RequireView)('crm', 'contacts'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.QueryContactsDto]),
    __metadata("design:returntype", void 0)
], CompanyContactsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('export'),
    (0, permissions_guard_1.RequireView)('crm', 'contacts'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Query)('format')),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.QueryContactsDto, String, Object]),
    __metadata("design:returntype", Promise)
], CompanyContactsController.prototype, "export", null);
__decorate([
    (0, common_1.Get)('by-customer/:customerId'),
    (0, permissions_guard_1.RequireView)('crm', 'contacts'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('customerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyContactsController.prototype, "findByCustomer", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_guard_1.RequireView)('crm', 'contacts'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyContactsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_guard_1.RequireEdit)('crm', 'contacts'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.UpdateContactDto]),
    __metadata("design:returntype", void 0)
], CompanyContactsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_guard_1.RequireDelete)('crm', 'contacts'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyContactsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/set-primary'),
    (0, permissions_guard_1.RequireEdit)('crm', 'contacts'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyContactsController.prototype, "setAsPrimary", null);
exports.CompanyContactsController = CompanyContactsController = __decorate([
    (0, common_1.Controller)('companies/:companyId/contacts'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, company_access_guard_1.CompanyAccessGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [contacts_service_1.ContactsService,
        export_service_1.ExportService])
], CompanyContactsController);
//# sourceMappingURL=company-contacts.controller.js.map