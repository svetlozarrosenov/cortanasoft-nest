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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../prisma/prisma.service");
let AuthService = class AuthService {
    prisma;
    jwtService;
    configService;
    constructor(prisma, jwtService, configService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.configService = configService;
    }
    async validateUser(email, password) {
        const user = await this.prisma.user.findUnique({
            where: { email },
            include: {
                userCompanies: {
                    include: {
                        company: {
                            include: {
                                currency: true,
                            },
                        },
                        role: true,
                    },
                    orderBy: {
                        isDefault: 'desc',
                    },
                },
            },
        });
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (user.userCompanies.length === 0) {
            throw new common_1.UnauthorizedException('User has no company assigned');
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const defaultUserCompany = user.userCompanies.find((uc) => uc.isDefault && uc.company.isActive) ||
            user.userCompanies.find((uc) => uc.company.isActive);
        if (!defaultUserCompany) {
            throw new common_1.UnauthorizedException('No active company found');
        }
        const { password: _, ...result } = user;
        return {
            ...result,
            defaultUserCompany,
        };
    }
    async login(loginDto) {
        const user = await this.validateUser(loginDto.email, loginDto.password);
        const payload = {
            sub: user.id,
            email: user.email,
            companyId: user.defaultUserCompany.companyId,
            roleId: user.defaultUserCompany.roleId,
        };
        const expiresIn = loginDto.rememberMe ? '30d' : '1d';
        const accessToken = this.jwtService.sign(payload, { expiresIn });
        const currentCompany = user.defaultUserCompany.company;
        const currentRole = user.defaultUserCompany.role;
        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                isActive: user.isActive,
                isSuperAdmin: currentCompany.role === 'OWNER',
                currentCompany,
                currentRole,
                companies: user.userCompanies.map((uc) => ({
                    id: uc.company.id,
                    name: uc.company.name,
                    eik: uc.company.eik,
                    role: uc.role,
                    isDefault: uc.isDefault,
                })),
            },
            accessToken,
            rememberMe: loginDto.rememberMe || false,
        };
    }
    async switchCompany(userId, companyId) {
        const userCompany = await this.prisma.userCompany.findUnique({
            where: {
                userId_companyId: {
                    userId,
                    companyId,
                },
            },
            include: {
                company: {
                    include: {
                        currency: true,
                    },
                },
                user: true,
                role: true,
            },
        });
        if (!userCompany) {
            throw new common_1.UnauthorizedException('User does not belong to this company');
        }
        if (!userCompany.company.isActive) {
            throw new common_1.UnauthorizedException('Company is inactive');
        }
        const payload = {
            sub: userCompany.user.id,
            email: userCompany.user.email,
            companyId: userCompany.companyId,
            roleId: userCompany.roleId,
        };
        const accessToken = this.jwtService.sign(payload);
        return {
            accessToken,
            currentCompany: userCompany.company,
            currentRole: userCompany.role,
            isSuperAdmin: userCompany.company.role === 'OWNER',
        };
    }
    getCookieOptions(rememberMe = false) {
        const isProduction = this.configService.get('NODE_ENV') === 'production';
        const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
        if (isProduction) {
            return {
                httpOnly: true,
                secure: true,
                sameSite: 'strict',
                maxAge,
                path: '/',
            };
        }
        return {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge,
            path: '/',
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map