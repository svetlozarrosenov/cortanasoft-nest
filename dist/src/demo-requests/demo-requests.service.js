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
exports.DemoRequestsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let DemoRequestsService = class DemoRequestsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        return this.prisma.demoRequest.create({
            data: {
                name: dto.name,
                email: dto.email,
                phone: dto.phone,
                companyName: dto.companyName,
                employeeCount: dto.employeeCount,
                message: dto.message,
                status: client_1.DemoRequestStatus.NEW,
            },
        });
    }
    async findAll(query) {
        const { search, status, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', } = query;
        const where = {
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { companyName: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search, mode: 'insensitive' } },
                ],
            }),
            ...(status && { status }),
        };
        const [items, total] = await Promise.all([
            this.prisma.demoRequest.findMany({
                where,
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.demoRequest.count({ where }),
        ]);
        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async findOne(id) {
        const demoRequest = await this.prisma.demoRequest.findUnique({
            where: { id },
        });
        if (!demoRequest) {
            throw new common_1.NotFoundException('Demo request not found');
        }
        return demoRequest;
    }
    async update(id, dto) {
        await this.findOne(id);
        return this.prisma.demoRequest.update({
            where: { id },
            data: {
                ...(dto.status && { status: dto.status }),
                ...(dto.notes !== undefined && { notes: dto.notes }),
                ...(dto.contactedAt && { contactedAt: new Date(dto.contactedAt) }),
                ...(dto.scheduledAt && { scheduledAt: new Date(dto.scheduledAt) }),
                ...(dto.completedAt && { completedAt: new Date(dto.completedAt) }),
            },
        });
    }
    async remove(id) {
        await this.findOne(id);
        return this.prisma.demoRequest.delete({
            where: { id },
        });
    }
    async getStats() {
        const [total, byStatus] = await Promise.all([
            this.prisma.demoRequest.count(),
            this.prisma.demoRequest.groupBy({
                by: ['status'],
                _count: true,
            }),
        ]);
        const statusCounts = byStatus.reduce((acc, item) => {
            acc[item.status] = item._count;
            return acc;
        }, {});
        return {
            total,
            byStatus: statusCounts,
        };
    }
    getStatuses() {
        return Object.values(client_1.DemoRequestStatus);
    }
};
exports.DemoRequestsService = DemoRequestsService;
exports.DemoRequestsService = DemoRequestsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DemoRequestsService);
//# sourceMappingURL=demo-requests.service.js.map