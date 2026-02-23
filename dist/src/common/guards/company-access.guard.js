"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyAccessGuard = void 0;
const common_1 = require("@nestjs/common");
let CompanyAccessGuard = class CompanyAccessGuard {
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const companyId = request.params.companyId;
        if (!user) {
            throw new common_1.ForbiddenException('User not authenticated');
        }
        if (!companyId) {
            throw new common_1.BadRequestException('Company ID is required');
        }
        const hasAccess = user.companies?.some((c) => c.id === companyId);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('Access denied. You do not have access to this company.');
        }
        request.companyId = companyId;
        return true;
    }
};
exports.CompanyAccessGuard = CompanyAccessGuard;
exports.CompanyAccessGuard = CompanyAccessGuard = __decorate([
    (0, common_1.Injectable)()
], CompanyAccessGuard);
//# sourceMappingURL=company-access.guard.js.map