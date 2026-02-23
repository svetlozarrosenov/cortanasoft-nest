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
exports.EmployeesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let EmployeesService = class EmployeesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(companyId) {
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
        });
        if (!company) {
            throw new common_1.NotFoundException('Company not found');
        }
        const userCompanies = await this.prisma.userCompany.findMany({
            where: { companyId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        isActive: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                },
                role: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                    },
                },
            },
            orderBy: {
                user: {
                    firstName: 'asc',
                },
            },
        });
        return {
            data: userCompanies.map((uc) => ({
                id: uc.user.id,
                email: uc.user.email,
                firstName: uc.user.firstName,
                lastName: uc.user.lastName,
                isActive: uc.user.isActive,
                role: uc.role,
                isDefault: uc.isDefault,
                createdAt: uc.user.createdAt,
                updatedAt: uc.user.updatedAt,
            })),
            meta: {
                total: userCompanies.length,
            },
        };
    }
    async findOne(companyId, userId) {
        const userCompany = await this.prisma.userCompany.findFirst({
            where: {
                companyId,
                userId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        isActive: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                },
                role: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                    },
                },
            },
        });
        if (!userCompany) {
            throw new common_1.NotFoundException('Employee not found in this company');
        }
        return {
            id: userCompany.user.id,
            email: userCompany.user.email,
            firstName: userCompany.user.firstName,
            lastName: userCompany.user.lastName,
            isActive: userCompany.user.isActive,
            role: userCompany.role,
            isDefault: userCompany.isDefault,
            createdAt: userCompany.user.createdAt,
            updatedAt: userCompany.user.updatedAt,
        };
    }
};
exports.EmployeesService = EmployeesService;
exports.EmployeesService = EmployeesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EmployeesService);
//# sourceMappingURL=employees.service.js.map