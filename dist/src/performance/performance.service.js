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
exports.PerformanceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let PerformanceService = class PerformanceService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(companyId, dto) {
        const userCompany = await this.prisma.userCompany.findFirst({
            where: {
                userId: dto.userId,
                companyId,
            },
        });
        if (!userCompany) {
            throw new common_1.BadRequestException('User is not part of this company');
        }
        if (dto.reviewerId) {
            const reviewerCompany = await this.prisma.userCompany.findFirst({
                where: {
                    userId: dto.reviewerId,
                    companyId,
                },
            });
            if (!reviewerCompany) {
                throw new common_1.BadRequestException('Reviewer is not part of this company');
            }
        }
        const { items, ...reviewData } = dto;
        return this.prisma.performanceReview.create({
            data: {
                ...reviewData,
                periodStart: new Date(dto.periodStart),
                periodEnd: new Date(dto.periodEnd),
                reviewDate: dto.reviewDate ? new Date(dto.reviewDate) : null,
                companyId,
                items: items
                    ? {
                        create: items.map((item) => ({
                            type: item.type,
                            name: item.name,
                            description: item.description,
                            weight: item.weight,
                            targetValue: item.targetValue,
                            actualValue: item.actualValue,
                            rating: item.rating,
                            score: item.score,
                            comments: item.comments,
                            selfRating: item.selfRating,
                            selfScore: item.selfScore,
                            selfComments: item.selfComments,
                        })),
                    }
                    : undefined,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                reviewer: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                items: true,
            },
        });
    }
    async findAll(companyId, query) {
        const { search, status, type, userId, reviewerId, periodFrom, periodTo, year, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', } = query;
        const where = { companyId };
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { user: { firstName: { contains: search, mode: 'insensitive' } } },
                { user: { lastName: { contains: search, mode: 'insensitive' } } },
            ];
        }
        if (status) {
            where.status = status;
        }
        if (type) {
            where.type = type;
        }
        if (userId) {
            where.userId = userId;
        }
        if (reviewerId) {
            where.reviewerId = reviewerId;
        }
        if (periodFrom) {
            where.periodStart = {
                ...where.periodStart,
                gte: new Date(periodFrom),
            };
        }
        if (periodTo) {
            where.periodEnd = {
                ...where.periodEnd,
                lte: new Date(periodTo),
            };
        }
        if (year) {
            const startOfYear = new Date(year, 0, 1);
            const endOfYear = new Date(year, 11, 31, 23, 59, 59);
            where.periodStart = {
                ...where.periodStart,
                gte: startOfYear,
            };
            where.periodEnd = {
                ...where.periodEnd,
                lte: endOfYear,
            };
        }
        const [data, total] = await Promise.all([
            this.prisma.performanceReview.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                    reviewer: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                    _count: {
                        select: { items: true },
                    },
                },
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.performanceReview.count({ where }),
        ]);
        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findOne(companyId, id) {
        const review = await this.prisma.performanceReview.findFirst({
            where: { id, companyId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                reviewer: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                items: {
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
        if (!review) {
            throw new common_1.NotFoundException('Performance review not found');
        }
        return review;
    }
    async update(companyId, id, dto) {
        const review = await this.findOne(companyId, id);
        if (review.status === 'COMPLETED' || review.status === 'CANCELLED') {
            throw new common_1.BadRequestException('Cannot update a completed or cancelled review');
        }
        const { items, ...reviewData } = dto;
        if (items) {
            await this.prisma.performanceReviewItem.deleteMany({
                where: { reviewId: id },
            });
            await this.prisma.performanceReviewItem.createMany({
                data: items.map((item) => ({
                    reviewId: id,
                    type: item.type,
                    name: item.name,
                    description: item.description,
                    weight: item.weight,
                    targetValue: item.targetValue,
                    actualValue: item.actualValue,
                    rating: item.rating,
                    score: item.score,
                    comments: item.comments,
                    selfRating: item.selfRating,
                    selfScore: item.selfScore,
                    selfComments: item.selfComments,
                })),
            });
        }
        return this.prisma.performanceReview.update({
            where: { id },
            data: {
                ...reviewData,
                periodStart: dto.periodStart ? new Date(dto.periodStart) : undefined,
                periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : undefined,
                reviewDate: dto.reviewDate ? new Date(dto.reviewDate) : undefined,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                reviewer: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                items: true,
            },
        });
    }
    async remove(companyId, id) {
        const review = await this.findOne(companyId, id);
        if (review.status === 'COMPLETED') {
            throw new common_1.BadRequestException('Cannot delete a completed review');
        }
        await this.prisma.performanceReview.delete({
            where: { id },
        });
        return { success: true, message: 'Performance review deleted' };
    }
    async startReview(companyId, id) {
        const review = await this.findOne(companyId, id);
        if (review.status !== 'DRAFT' && review.status !== 'PENDING') {
            throw new common_1.BadRequestException('Can only start reviews in DRAFT or PENDING status');
        }
        return this.prisma.performanceReview.update({
            where: { id },
            data: {
                status: 'IN_PROGRESS',
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                reviewer: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                items: true,
            },
        });
    }
    async submitForReview(companyId, id) {
        const review = await this.findOne(companyId, id);
        if (review.status !== 'DRAFT') {
            throw new common_1.BadRequestException('Can only submit reviews in DRAFT status');
        }
        return this.prisma.performanceReview.update({
            where: { id },
            data: {
                status: 'PENDING',
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                reviewer: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                items: true,
            },
        });
    }
    async complete(companyId, id) {
        const review = await this.findOne(companyId, id);
        if (review.status !== 'IN_PROGRESS') {
            throw new common_1.BadRequestException('Can only complete reviews that are in progress');
        }
        let overallScore = review.overallScore
            ? Number(review.overallScore)
            : null;
        if (!overallScore && review.items.length > 0) {
            const itemsWithScores = review.items.filter((item) => item.score);
            if (itemsWithScores.length > 0) {
                const totalWeight = itemsWithScores.reduce((sum, item) => sum + Number(item.weight || 1), 0);
                const weightedScore = itemsWithScores.reduce((sum, item) => sum + Number(item.score) * Number(item.weight || 1), 0);
                overallScore = weightedScore / totalWeight;
            }
        }
        return this.prisma.performanceReview.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                overallScore,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                reviewer: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                items: true,
            },
        });
    }
    async cancel(companyId, id) {
        const review = await this.findOne(companyId, id);
        if (review.status === 'COMPLETED') {
            throw new common_1.BadRequestException('Cannot cancel a completed review');
        }
        return this.prisma.performanceReview.update({
            where: { id },
            data: {
                status: 'CANCELLED',
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                reviewer: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                items: true,
            },
        });
    }
    async getSummary(companyId, year) {
        const where = { companyId };
        if (year) {
            const startOfYear = new Date(year, 0, 1);
            const endOfYear = new Date(year, 11, 31, 23, 59, 59);
            where.periodStart = { gte: startOfYear };
            where.periodEnd = { lte: endOfYear };
        }
        const reviews = await this.prisma.performanceReview.findMany({
            where,
            select: {
                status: true,
                overallScore: true,
                overallRating: true,
                type: true,
            },
        });
        const completedReviews = reviews.filter((r) => r.status === 'COMPLETED');
        const avgScore = completedReviews.length > 0
            ? completedReviews
                .filter((r) => r.overallScore)
                .reduce((sum, r) => sum + Number(r.overallScore), 0) /
                completedReviews.filter((r) => r.overallScore).length
            : 0;
        const ratingCounts = {
            EXCEPTIONAL: 0,
            EXCEEDS: 0,
            MEETS: 0,
            NEEDS_IMPROVEMENT: 0,
            UNSATISFACTORY: 0,
        };
        completedReviews.forEach((r) => {
            if (r.overallRating && ratingCounts[r.overallRating] !== undefined) {
                ratingCounts[r.overallRating]++;
            }
        });
        const statusCounts = {
            DRAFT: 0,
            PENDING: 0,
            IN_PROGRESS: 0,
            COMPLETED: 0,
            CANCELLED: 0,
        };
        reviews.forEach((r) => {
            if (statusCounts[r.status] !== undefined) {
                statusCounts[r.status]++;
            }
        });
        const typeCounts = {};
        reviews.forEach((r) => {
            typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
        });
        return {
            totalReviews: reviews.length,
            completedReviews: completedReviews.length,
            averageScore: Math.round(avgScore * 100) / 100,
            statusCounts,
            ratingCounts,
            typeCounts,
        };
    }
};
exports.PerformanceService = PerformanceService;
exports.PerformanceService = PerformanceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PerformanceService);
//# sourceMappingURL=performance.service.js.map