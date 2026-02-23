"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const permissions_config_1 = require("../common/config/permissions.config");
let AdminService = class AdminService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAllCompanies() {
        return this.prisma.company.findMany({
            include: {
                currency: true,
                userCompanies: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                firstName: true,
                                lastName: true,
                                isActive: true,
                            },
                        },
                        role: true,
                    },
                },
                _count: {
                    select: {
                        userCompanies: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
    async findCompanyById(id) {
        const company = await this.prisma.company.findUnique({
            where: { id },
            include: {
                country: true,
                currency: true,
                settlement: true,
                userCompanies: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                firstName: true,
                                lastName: true,
                                isActive: true,
                            },
                        },
                        role: true,
                    },
                },
            },
        });
        if (!company) {
            throw new common_1.NotFoundException('Company not found');
        }
        return company;
    }
    async createCompany(dto) {
        const existingEik = await this.prisma.company.findUnique({
            where: { eik: dto.eik },
        });
        if (existingEik) {
            throw new common_1.BadRequestException('Компания с този ЕИК вече съществува');
        }
        if (dto.vatNumber) {
            const existingVat = await this.prisma.company.findUnique({
                where: { vatNumber: dto.vatNumber },
            });
            if (existingVat) {
                throw new common_1.BadRequestException('Компания с този ДДС номер вече съществува');
            }
        }
        if (dto.role === client_1.CompanyRole.OWNER) {
            throw new common_1.ForbiddenException('Cannot create company with OWNER role');
        }
        return this.prisma.company.create({
            data: {
                name: dto.name,
                eik: dto.eik,
                vatNumber: dto.vatNumber,
                address: dto.address,
                city: dto.city,
                postalCode: dto.postalCode,
                countryId: dto.countryId,
                settlementId: dto.settlementId,
                molName: dto.molName,
                phone: dto.phone,
                email: dto.email,
                website: dto.website,
                bankName: dto.bankName,
                iban: dto.iban,
                bic: dto.bic,
                currencyId: dto.currencyId,
                role: dto.role || client_1.CompanyRole.CLIENT,
                isActive: dto.isActive ?? true,
            },
            include: {
                country: true,
                currency: true,
                settlement: true,
            },
        });
    }
    async updateCompany(id, dto) {
        const company = await this.prisma.company.findUnique({
            where: { id },
        });
        if (!company) {
            throw new common_1.NotFoundException('Company not found');
        }
        if (company.role === client_1.CompanyRole.OWNER && dto.role === client_1.CompanyRole.CLIENT) {
            throw new common_1.ForbiddenException('Cannot change OWNER company to CLIENT');
        }
        if (company.role === client_1.CompanyRole.CLIENT && dto.role === client_1.CompanyRole.OWNER) {
            throw new common_1.ForbiddenException('Cannot change CLIENT company to OWNER');
        }
        if (dto.eik && dto.eik !== company.eik) {
            const existingEik = await this.prisma.company.findUnique({
                where: { eik: dto.eik },
            });
            if (existingEik) {
                throw new common_1.BadRequestException('Компания с този ЕИК вече съществува');
            }
        }
        if (dto.vatNumber && dto.vatNumber !== company.vatNumber) {
            const existingVat = await this.prisma.company.findUnique({
                where: { vatNumber: dto.vatNumber },
            });
            if (existingVat) {
                throw new common_1.BadRequestException('Компания с този ДДС номер вече съществува');
            }
        }
        return this.prisma.company.update({
            where: { id },
            data: {
                name: dto.name,
                eik: dto.eik,
                vatNumber: dto.vatNumber,
                address: dto.address,
                city: dto.city,
                postalCode: dto.postalCode,
                countryId: dto.countryId,
                settlementId: dto.settlementId,
                molName: dto.molName,
                phone: dto.phone,
                email: dto.email,
                website: dto.website,
                bankName: dto.bankName,
                iban: dto.iban,
                bic: dto.bic,
                currencyId: dto.currencyId,
                role: dto.role,
                isActive: dto.isActive,
            },
            include: {
                country: true,
                currency: true,
                settlement: true,
            },
        });
    }
    async deleteCompany(id) {
        const company = await this.prisma.company.findUnique({
            where: { id },
        });
        if (!company) {
            throw new common_1.NotFoundException('Company not found');
        }
        if (company.role === client_1.CompanyRole.OWNER) {
            throw new common_1.ForbiddenException('Cannot delete OWNER company');
        }
        return this.prisma.company.delete({
            where: { id },
        });
    }
    async findAllUsers() {
        return this.prisma.user.findMany({
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                userCompanies: {
                    include: {
                        company: {
                            select: {
                                id: true,
                                name: true,
                                eik: true,
                                role: true,
                            },
                        },
                        role: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
    async findUserById(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                userCompanies: {
                    include: {
                        company: {
                            select: {
                                id: true,
                                name: true,
                                eik: true,
                                role: true,
                            },
                        },
                        role: true,
                    },
                },
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async createUser(dto) {
        const existingEmail = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existingEmail) {
            throw new common_1.BadRequestException('A user with this email already exists');
        }
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                password: hashedPassword,
                firstName: dto.firstName,
                lastName: dto.lastName,
                isActive: dto.isActive ?? true,
            },
        });
        if (dto.companies && dto.companies.length > 0) {
            await this.prisma.userCompany.createMany({
                data: dto.companies.map((c) => ({
                    userId: user.id,
                    companyId: c.companyId,
                    roleId: c.roleId,
                    isDefault: c.isDefault ?? false,
                })),
            });
        }
        return this.findUserById(user.id);
    }
    async updateUser(id, dto) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: {
                userCompanies: {
                    include: {
                        company: true,
                    },
                },
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const isOwnerCompanyUser = user.userCompanies.some((uc) => uc.company.role === 'OWNER');
        if (isOwnerCompanyUser && dto.isActive === false) {
            throw new common_1.ForbiddenException('Cannot deactivate a platform owner user');
        }
        if (dto.email && dto.email !== user.email) {
            const existingEmail = await this.prisma.user.findUnique({
                where: { email: dto.email },
            });
            if (existingEmail) {
                throw new common_1.BadRequestException('A user with this email already exists');
            }
        }
        const updateData = {
            email: dto.email,
            firstName: dto.firstName,
            lastName: dto.lastName,
            isActive: dto.isActive,
        };
        if (dto.password) {
            updateData.password = await bcrypt.hash(dto.password, 10);
        }
        await this.prisma.user.update({
            where: { id },
            data: updateData,
        });
        if (dto.companies) {
            if (isOwnerCompanyUser) {
                await this.prisma.userCompany.deleteMany({
                    where: {
                        userId: id,
                        company: {
                            role: 'CLIENT',
                        },
                    },
                });
            }
            else {
                await this.prisma.userCompany.deleteMany({
                    where: { userId: id },
                });
            }
            const companiesToAdd = isOwnerCompanyUser
                ? dto.companies.filter((c) => {
                    const existingOwnerCompany = user.userCompanies.find((uc) => uc.company.role === 'OWNER');
                    return c.companyId !== existingOwnerCompany?.companyId;
                })
                : dto.companies;
            if (companiesToAdd.length > 0) {
                await this.prisma.userCompany.createMany({
                    data: companiesToAdd.map((c) => ({
                        userId: id,
                        companyId: c.companyId,
                        roleId: c.roleId,
                        isDefault: c.isDefault ?? false,
                    })),
                });
            }
        }
        return this.findUserById(id);
    }
    async deleteUser(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: {
                userCompanies: {
                    include: {
                        company: true,
                    },
                },
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const isOwnerCompanyUser = user.userCompanies.some((uc) => uc.company.role === 'OWNER');
        if (isOwnerCompanyUser) {
            throw new common_1.ForbiddenException('Cannot delete a platform owner user');
        }
        return this.prisma.user.delete({
            where: { id },
        });
    }
    async findRolesByCompany(companyId) {
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
        });
        if (!company) {
            throw new common_1.NotFoundException('Company not found');
        }
        return this.prisma.role.findMany({
            where: { companyId },
            include: {
                _count: {
                    select: {
                        userCompanies: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });
    }
    async findRoleById(id) {
        const role = await this.prisma.role.findUnique({
            where: { id },
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                _count: {
                    select: {
                        userCompanies: true,
                    },
                },
            },
        });
        if (!role) {
            throw new common_1.NotFoundException('Role not found');
        }
        return role;
    }
    async createRole(dto) {
        const company = await this.prisma.company.findUnique({
            where: { id: dto.companyId },
        });
        if (!company) {
            throw new common_1.NotFoundException('Company not found');
        }
        const existingRole = await this.prisma.role.findUnique({
            where: {
                companyId_name: {
                    companyId: dto.companyId,
                    name: dto.name,
                },
            },
        });
        if (existingRole) {
            throw new common_1.BadRequestException('Роля с това име вече съществува в тази компания');
        }
        let permissions = dto.permissions || (0, permissions_config_1.createEmptyPermissions)();
        if (company.role === client_1.CompanyRole.CLIENT) {
            permissions = (0, permissions_config_1.stripAdminModuleFromPermissions)(permissions);
        }
        return this.prisma.role.create({
            data: {
                name: dto.name,
                description: dto.description,
                permissions: permissions,
                isDefault: dto.isDefault ?? false,
                companyId: dto.companyId,
            },
        });
    }
    async updateRole(id, dto) {
        const role = await this.prisma.role.findUnique({
            where: { id },
            include: {
                company: true,
            },
        });
        if (!role) {
            throw new common_1.NotFoundException('Role not found');
        }
        if (dto.name && dto.name !== role.name) {
            const existingRole = await this.prisma.role.findUnique({
                where: {
                    companyId_name: {
                        companyId: role.companyId,
                        name: dto.name,
                    },
                },
            });
            if (existingRole) {
                throw new common_1.BadRequestException('Роля с това име вече съществува в тази компания');
            }
        }
        let permissions = dto.permissions;
        if (permissions && role.company.role === client_1.CompanyRole.CLIENT) {
            permissions = (0, permissions_config_1.stripAdminModuleFromPermissions)(permissions);
        }
        return this.prisma.role.update({
            where: { id },
            data: {
                name: dto.name,
                description: dto.description,
                permissions: permissions,
                isDefault: dto.isDefault,
            },
        });
    }
    async deleteRole(id) {
        const role = await this.prisma.role.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        userCompanies: true,
                    },
                },
            },
        });
        if (!role) {
            throw new common_1.NotFoundException('Role not found');
        }
        if (role._count.userCompanies > 0) {
            throw new common_1.BadRequestException(`Не може да изтриете ролята - има ${role._count.userCompanies} потребител(и) с тази роля`);
        }
        return this.prisma.role.delete({
            where: { id },
        });
    }
    async findUsersByCompany(companyId) {
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
        });
        if (!company) {
            throw new common_1.NotFoundException('Company not found');
        }
        return this.prisma.userCompany.findMany({
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
                    },
                },
                role: true,
            },
            orderBy: {
                user: {
                    firstName: 'asc',
                },
            },
        });
    }
    async findUsersNotInCompany(companyId) {
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
        });
        if (!company) {
            throw new common_1.NotFoundException('Company not found');
        }
        return this.prisma.user.findMany({
            where: {
                userCompanies: {
                    none: {
                        companyId,
                    },
                },
                isActive: true,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                isActive: true,
                createdAt: true,
                userCompanies: {
                    include: {
                        company: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                        role: true,
                    },
                },
            },
            orderBy: {
                firstName: 'asc',
            },
        });
    }
    async assignUserToCompany(companyId, userId, roleId, isDefault) {
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
        });
        if (!company) {
            throw new common_1.NotFoundException('Company not found');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const role = await this.prisma.role.findUnique({
            where: { id: roleId },
        });
        if (!role || role.companyId !== companyId) {
            throw new common_1.BadRequestException('Invalid role for this company');
        }
        const existingAssignment = await this.prisma.userCompany.findUnique({
            where: {
                userId_companyId: {
                    userId,
                    companyId,
                },
            },
        });
        if (existingAssignment) {
            throw new common_1.BadRequestException('User is already assigned to this company');
        }
        return this.prisma.userCompany.create({
            data: {
                userId,
                companyId,
                roleId,
                isDefault: isDefault ?? false,
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
                    },
                },
                role: true,
            },
        });
    }
    async removeUserFromCompany(companyId, userId) {
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
        });
        if (!company) {
            throw new common_1.NotFoundException('Company not found');
        }
        if (company.role === 'OWNER') {
            throw new common_1.ForbiddenException('Cannot remove users from platform owner company');
        }
        const userCompany = await this.prisma.userCompany.findUnique({
            where: {
                userId_companyId: {
                    userId,
                    companyId,
                },
            },
        });
        if (!userCompany) {
            throw new common_1.NotFoundException('User is not assigned to this company');
        }
        return this.prisma.userCompany.delete({
            where: {
                userId_companyId: {
                    userId,
                    companyId,
                },
            },
        });
    }
    async updateUserCompanyRole(companyId, userId, roleId) {
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
        });
        if (!company) {
            throw new common_1.NotFoundException('Company not found');
        }
        const role = await this.prisma.role.findUnique({
            where: { id: roleId },
        });
        if (!role || role.companyId !== companyId) {
            throw new common_1.BadRequestException('Invalid role for this company');
        }
        const userCompany = await this.prisma.userCompany.findUnique({
            where: {
                userId_companyId: {
                    userId,
                    companyId,
                },
            },
        });
        if (!userCompany) {
            throw new common_1.NotFoundException('User is not assigned to this company');
        }
        return this.prisma.userCompany.update({
            where: {
                userId_companyId: {
                    userId,
                    companyId,
                },
            },
            data: {
                roleId,
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
                    },
                },
                role: true,
            },
        });
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminService);
//# sourceMappingURL=admin.service.js.map