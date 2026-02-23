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
exports.PermissionsGuard = exports.RequireDelete = exports.RequireEdit = exports.RequireCreate = exports.RequireView = exports.RequirePermissions = exports.PERMISSIONS_KEY = void 0;
exports.checkPermission = checkPermission;
exports.getVisibleColumns = getVisibleColumns;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const prisma_service_1 = require("../../prisma/prisma.service");
const error_messages_1 = require("../constants/error-messages");
exports.PERMISSIONS_KEY = 'permissions';
const RequirePermissions = (...permissions) => (0, common_1.SetMetadata)(exports.PERMISSIONS_KEY, permissions);
exports.RequirePermissions = RequirePermissions;
const RequireView = (module, page) => (0, exports.RequirePermissions)({ module, page, action: 'view' });
exports.RequireView = RequireView;
const RequireCreate = (module, page) => (0, exports.RequirePermissions)({ module, page, action: 'create' });
exports.RequireCreate = RequireCreate;
const RequireEdit = (module, page) => (0, exports.RequirePermissions)({ module, page, action: 'edit' });
exports.RequireEdit = RequireEdit;
const RequireDelete = (module, page) => (0, exports.RequirePermissions)({ module, page, action: 'delete' });
exports.RequireDelete = RequireDelete;
let PermissionsGuard = class PermissionsGuard {
    reflector;
    prisma;
    constructor(reflector, prisma) {
        this.reflector = reflector;
        this.prisma = prisma;
    }
    async canActivate(context) {
        const requiredPermissions = this.reflector.getAllAndOverride(exports.PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);
        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const companyId = request.params.companyId || request.companyId;
        if (!user) {
            throw new common_1.ForbiddenException(error_messages_1.ErrorMessages.common.userNotAuthenticated);
        }
        const ownerCompany = user.companies?.find((c) => c.id === companyId && c.role === 'OWNER');
        if (ownerCompany) {
            return true;
        }
        const userCompany = await this.prisma.userCompany.findUnique({
            where: {
                userId_companyId: {
                    userId: user.id,
                    companyId: companyId,
                },
            },
            include: {
                role: true,
            },
        });
        if (!userCompany || !userCompany.role) {
            throw new common_1.ForbiddenException(error_messages_1.ErrorMessages.common.noRoleAssigned);
        }
        const permissions = userCompany.role
            .permissions;
        for (const required of requiredPermissions) {
            if (!this.hasPermission(permissions, required)) {
                throw new common_1.ForbiddenException(error_messages_1.ErrorMessages.common.missingPermission(`${required.module}.${required.page}.${required.action}`));
            }
        }
        return true;
    }
    hasPermission(permissions, required) {
        if (!permissions?.modules) {
            return false;
        }
        const module = permissions.modules[required.module];
        if (!module?.enabled) {
            return false;
        }
        const page = module.pages?.[required.page];
        if (!page?.enabled) {
            return false;
        }
        return page.actions?.[required.action] || false;
    }
};
exports.PermissionsGuard = PermissionsGuard;
exports.PermissionsGuard = PermissionsGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        prisma_service_1.PrismaService])
], PermissionsGuard);
function checkPermission(permissions, module, page, action) {
    if (!permissions?.modules) {
        return false;
    }
    const moduleConfig = permissions.modules[module];
    if (!moduleConfig?.enabled) {
        return false;
    }
    const pageConfig = moduleConfig.pages?.[page];
    if (!pageConfig?.enabled) {
        return false;
    }
    return pageConfig.actions?.[action] || false;
}
function getVisibleColumns(permissions, module, page, table) {
    if (!permissions?.modules) {
        return null;
    }
    const moduleConfig = permissions.modules[module];
    if (!moduleConfig?.enabled) {
        return [];
    }
    const pageConfig = moduleConfig.pages?.[page];
    if (!pageConfig?.enabled) {
        return [];
    }
    const tableConfig = pageConfig.tables?.[table];
    if (!tableConfig?.enabled) {
        return null;
    }
    return tableConfig.columns || [];
}
//# sourceMappingURL=permissions.guard.js.map