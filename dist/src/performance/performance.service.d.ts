import { PrismaService } from '../prisma/prisma.service';
import { CreatePerformanceReviewDto, UpdatePerformanceReviewDto, QueryPerformanceReviewDto } from './dto';
export declare class PerformanceService {
    private prisma;
    constructor(prisma: PrismaService);
    create(companyId: string, dto: CreatePerformanceReviewDto): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
        items: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            type: import(".prisma/client").$Enums.PerformanceItemType;
            description: string | null;
            score: import("@prisma/client/runtime/library").Decimal | null;
            weight: import("@prisma/client/runtime/library").Decimal;
            targetValue: string | null;
            actualValue: string | null;
            rating: import(".prisma/client").$Enums.PerformanceRating | null;
            comments: string | null;
            selfRating: import(".prisma/client").$Enums.PerformanceRating | null;
            selfScore: import("@prisma/client/runtime/library").Decimal | null;
            selfComments: string | null;
            reviewId: string;
        }[];
        reviewer: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.PerformanceReviewType;
        companyId: string;
        userId: string;
        status: import(".prisma/client").$Enums.PerformanceReviewStatus;
        title: string;
        periodStart: Date;
        periodEnd: Date;
        reviewDate: Date | null;
        reviewerId: string | null;
        overallRating: import(".prisma/client").$Enums.PerformanceRating | null;
        overallScore: import("@prisma/client/runtime/library").Decimal | null;
        achievements: string | null;
        areasToImprove: string | null;
        managerComments: string | null;
        employeeComments: string | null;
        developmentPlan: string | null;
        nextPeriodGoals: string | null;
        completedAt: Date | null;
    }>;
    findAll(companyId: string, query: QueryPerformanceReviewDto): Promise<{
        data: ({
            user: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            };
            _count: {
                items: number;
            };
            reviewer: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            type: import(".prisma/client").$Enums.PerformanceReviewType;
            companyId: string;
            userId: string;
            status: import(".prisma/client").$Enums.PerformanceReviewStatus;
            title: string;
            periodStart: Date;
            periodEnd: Date;
            reviewDate: Date | null;
            reviewerId: string | null;
            overallRating: import(".prisma/client").$Enums.PerformanceRating | null;
            overallScore: import("@prisma/client/runtime/library").Decimal | null;
            achievements: string | null;
            areasToImprove: string | null;
            managerComments: string | null;
            employeeComments: string | null;
            developmentPlan: string | null;
            nextPeriodGoals: string | null;
            completedAt: Date | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(companyId: string, id: string): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
        items: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            type: import(".prisma/client").$Enums.PerformanceItemType;
            description: string | null;
            score: import("@prisma/client/runtime/library").Decimal | null;
            weight: import("@prisma/client/runtime/library").Decimal;
            targetValue: string | null;
            actualValue: string | null;
            rating: import(".prisma/client").$Enums.PerformanceRating | null;
            comments: string | null;
            selfRating: import(".prisma/client").$Enums.PerformanceRating | null;
            selfScore: import("@prisma/client/runtime/library").Decimal | null;
            selfComments: string | null;
            reviewId: string;
        }[];
        reviewer: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.PerformanceReviewType;
        companyId: string;
        userId: string;
        status: import(".prisma/client").$Enums.PerformanceReviewStatus;
        title: string;
        periodStart: Date;
        periodEnd: Date;
        reviewDate: Date | null;
        reviewerId: string | null;
        overallRating: import(".prisma/client").$Enums.PerformanceRating | null;
        overallScore: import("@prisma/client/runtime/library").Decimal | null;
        achievements: string | null;
        areasToImprove: string | null;
        managerComments: string | null;
        employeeComments: string | null;
        developmentPlan: string | null;
        nextPeriodGoals: string | null;
        completedAt: Date | null;
    }>;
    update(companyId: string, id: string, dto: UpdatePerformanceReviewDto): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
        items: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            type: import(".prisma/client").$Enums.PerformanceItemType;
            description: string | null;
            score: import("@prisma/client/runtime/library").Decimal | null;
            weight: import("@prisma/client/runtime/library").Decimal;
            targetValue: string | null;
            actualValue: string | null;
            rating: import(".prisma/client").$Enums.PerformanceRating | null;
            comments: string | null;
            selfRating: import(".prisma/client").$Enums.PerformanceRating | null;
            selfScore: import("@prisma/client/runtime/library").Decimal | null;
            selfComments: string | null;
            reviewId: string;
        }[];
        reviewer: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.PerformanceReviewType;
        companyId: string;
        userId: string;
        status: import(".prisma/client").$Enums.PerformanceReviewStatus;
        title: string;
        periodStart: Date;
        periodEnd: Date;
        reviewDate: Date | null;
        reviewerId: string | null;
        overallRating: import(".prisma/client").$Enums.PerformanceRating | null;
        overallScore: import("@prisma/client/runtime/library").Decimal | null;
        achievements: string | null;
        areasToImprove: string | null;
        managerComments: string | null;
        employeeComments: string | null;
        developmentPlan: string | null;
        nextPeriodGoals: string | null;
        completedAt: Date | null;
    }>;
    remove(companyId: string, id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    startReview(companyId: string, id: string): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
        items: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            type: import(".prisma/client").$Enums.PerformanceItemType;
            description: string | null;
            score: import("@prisma/client/runtime/library").Decimal | null;
            weight: import("@prisma/client/runtime/library").Decimal;
            targetValue: string | null;
            actualValue: string | null;
            rating: import(".prisma/client").$Enums.PerformanceRating | null;
            comments: string | null;
            selfRating: import(".prisma/client").$Enums.PerformanceRating | null;
            selfScore: import("@prisma/client/runtime/library").Decimal | null;
            selfComments: string | null;
            reviewId: string;
        }[];
        reviewer: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.PerformanceReviewType;
        companyId: string;
        userId: string;
        status: import(".prisma/client").$Enums.PerformanceReviewStatus;
        title: string;
        periodStart: Date;
        periodEnd: Date;
        reviewDate: Date | null;
        reviewerId: string | null;
        overallRating: import(".prisma/client").$Enums.PerformanceRating | null;
        overallScore: import("@prisma/client/runtime/library").Decimal | null;
        achievements: string | null;
        areasToImprove: string | null;
        managerComments: string | null;
        employeeComments: string | null;
        developmentPlan: string | null;
        nextPeriodGoals: string | null;
        completedAt: Date | null;
    }>;
    submitForReview(companyId: string, id: string): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
        items: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            type: import(".prisma/client").$Enums.PerformanceItemType;
            description: string | null;
            score: import("@prisma/client/runtime/library").Decimal | null;
            weight: import("@prisma/client/runtime/library").Decimal;
            targetValue: string | null;
            actualValue: string | null;
            rating: import(".prisma/client").$Enums.PerformanceRating | null;
            comments: string | null;
            selfRating: import(".prisma/client").$Enums.PerformanceRating | null;
            selfScore: import("@prisma/client/runtime/library").Decimal | null;
            selfComments: string | null;
            reviewId: string;
        }[];
        reviewer: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.PerformanceReviewType;
        companyId: string;
        userId: string;
        status: import(".prisma/client").$Enums.PerformanceReviewStatus;
        title: string;
        periodStart: Date;
        periodEnd: Date;
        reviewDate: Date | null;
        reviewerId: string | null;
        overallRating: import(".prisma/client").$Enums.PerformanceRating | null;
        overallScore: import("@prisma/client/runtime/library").Decimal | null;
        achievements: string | null;
        areasToImprove: string | null;
        managerComments: string | null;
        employeeComments: string | null;
        developmentPlan: string | null;
        nextPeriodGoals: string | null;
        completedAt: Date | null;
    }>;
    complete(companyId: string, id: string): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
        items: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            type: import(".prisma/client").$Enums.PerformanceItemType;
            description: string | null;
            score: import("@prisma/client/runtime/library").Decimal | null;
            weight: import("@prisma/client/runtime/library").Decimal;
            targetValue: string | null;
            actualValue: string | null;
            rating: import(".prisma/client").$Enums.PerformanceRating | null;
            comments: string | null;
            selfRating: import(".prisma/client").$Enums.PerformanceRating | null;
            selfScore: import("@prisma/client/runtime/library").Decimal | null;
            selfComments: string | null;
            reviewId: string;
        }[];
        reviewer: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.PerformanceReviewType;
        companyId: string;
        userId: string;
        status: import(".prisma/client").$Enums.PerformanceReviewStatus;
        title: string;
        periodStart: Date;
        periodEnd: Date;
        reviewDate: Date | null;
        reviewerId: string | null;
        overallRating: import(".prisma/client").$Enums.PerformanceRating | null;
        overallScore: import("@prisma/client/runtime/library").Decimal | null;
        achievements: string | null;
        areasToImprove: string | null;
        managerComments: string | null;
        employeeComments: string | null;
        developmentPlan: string | null;
        nextPeriodGoals: string | null;
        completedAt: Date | null;
    }>;
    cancel(companyId: string, id: string): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
        items: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            type: import(".prisma/client").$Enums.PerformanceItemType;
            description: string | null;
            score: import("@prisma/client/runtime/library").Decimal | null;
            weight: import("@prisma/client/runtime/library").Decimal;
            targetValue: string | null;
            actualValue: string | null;
            rating: import(".prisma/client").$Enums.PerformanceRating | null;
            comments: string | null;
            selfRating: import(".prisma/client").$Enums.PerformanceRating | null;
            selfScore: import("@prisma/client/runtime/library").Decimal | null;
            selfComments: string | null;
            reviewId: string;
        }[];
        reviewer: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.PerformanceReviewType;
        companyId: string;
        userId: string;
        status: import(".prisma/client").$Enums.PerformanceReviewStatus;
        title: string;
        periodStart: Date;
        periodEnd: Date;
        reviewDate: Date | null;
        reviewerId: string | null;
        overallRating: import(".prisma/client").$Enums.PerformanceRating | null;
        overallScore: import("@prisma/client/runtime/library").Decimal | null;
        achievements: string | null;
        areasToImprove: string | null;
        managerComments: string | null;
        employeeComments: string | null;
        developmentPlan: string | null;
        nextPeriodGoals: string | null;
        completedAt: Date | null;
    }>;
    getSummary(companyId: string, year?: number): Promise<{
        totalReviews: number;
        completedReviews: number;
        averageScore: number;
        statusCounts: {
            DRAFT: number;
            PENDING: number;
            IN_PROGRESS: number;
            COMPLETED: number;
            CANCELLED: number;
        };
        ratingCounts: {
            EXCEPTIONAL: number;
            EXCEEDS: number;
            MEETS: number;
            NEEDS_IMPROVEMENT: number;
            UNSATISFACTORY: number;
        };
        typeCounts: Record<string, number>;
    }>;
}
