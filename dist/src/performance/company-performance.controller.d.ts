import { PerformanceService } from './performance.service';
import { CreatePerformanceReviewDto, UpdatePerformanceReviewDto, QueryPerformanceReviewDto } from './dto';
export declare class CompanyPerformanceController {
    private readonly performanceService;
    constructor(performanceService: PerformanceService);
    create(companyId: string, dto: CreatePerformanceReviewDto): Promise<{
        user: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        };
        reviewer: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        items: {
            name: string;
            type: import(".prisma/client").$Enums.PerformanceItemType;
            createdAt: Date;
            description: string | null;
            rating: import(".prisma/client").$Enums.PerformanceRating | null;
            updatedAt: Date;
            id: string;
            weight: import("@prisma/client/runtime/library").Decimal;
            targetValue: string | null;
            actualValue: string | null;
            score: import("@prisma/client/runtime/library").Decimal | null;
            comments: string | null;
            selfRating: import(".prisma/client").$Enums.PerformanceRating | null;
            selfScore: import("@prisma/client/runtime/library").Decimal | null;
            selfComments: string | null;
            reviewId: string;
        }[];
    } & {
        type: import(".prisma/client").$Enums.PerformanceReviewType;
        status: import(".prisma/client").$Enums.PerformanceReviewStatus;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        companyId: string;
        userId: string;
        title: string;
        periodStart: Date;
        periodEnd: Date;
        reviewDate: Date | null;
        overallRating: import(".prisma/client").$Enums.PerformanceRating | null;
        overallScore: import("@prisma/client/runtime/library").Decimal | null;
        achievements: string | null;
        areasToImprove: string | null;
        managerComments: string | null;
        employeeComments: string | null;
        developmentPlan: string | null;
        nextPeriodGoals: string | null;
        completedAt: Date | null;
        reviewerId: string | null;
    }>;
    findAll(companyId: string, query: QueryPerformanceReviewDto): Promise<{
        data: ({
            user: {
                email: string;
                id: string;
                firstName: string;
                lastName: string;
            };
            reviewer: {
                email: string;
                id: string;
                firstName: string;
                lastName: string;
            } | null;
            _count: {
                items: number;
            };
        } & {
            type: import(".prisma/client").$Enums.PerformanceReviewType;
            status: import(".prisma/client").$Enums.PerformanceReviewStatus;
            createdAt: Date;
            updatedAt: Date;
            id: string;
            companyId: string;
            userId: string;
            title: string;
            periodStart: Date;
            periodEnd: Date;
            reviewDate: Date | null;
            overallRating: import(".prisma/client").$Enums.PerformanceRating | null;
            overallScore: import("@prisma/client/runtime/library").Decimal | null;
            achievements: string | null;
            areasToImprove: string | null;
            managerComments: string | null;
            employeeComments: string | null;
            developmentPlan: string | null;
            nextPeriodGoals: string | null;
            completedAt: Date | null;
            reviewerId: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getSummary(companyId: string, year?: string): Promise<{
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
    findOne(companyId: string, id: string): Promise<{
        user: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        };
        reviewer: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        items: {
            name: string;
            type: import(".prisma/client").$Enums.PerformanceItemType;
            createdAt: Date;
            description: string | null;
            rating: import(".prisma/client").$Enums.PerformanceRating | null;
            updatedAt: Date;
            id: string;
            weight: import("@prisma/client/runtime/library").Decimal;
            targetValue: string | null;
            actualValue: string | null;
            score: import("@prisma/client/runtime/library").Decimal | null;
            comments: string | null;
            selfRating: import(".prisma/client").$Enums.PerformanceRating | null;
            selfScore: import("@prisma/client/runtime/library").Decimal | null;
            selfComments: string | null;
            reviewId: string;
        }[];
    } & {
        type: import(".prisma/client").$Enums.PerformanceReviewType;
        status: import(".prisma/client").$Enums.PerformanceReviewStatus;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        companyId: string;
        userId: string;
        title: string;
        periodStart: Date;
        periodEnd: Date;
        reviewDate: Date | null;
        overallRating: import(".prisma/client").$Enums.PerformanceRating | null;
        overallScore: import("@prisma/client/runtime/library").Decimal | null;
        achievements: string | null;
        areasToImprove: string | null;
        managerComments: string | null;
        employeeComments: string | null;
        developmentPlan: string | null;
        nextPeriodGoals: string | null;
        completedAt: Date | null;
        reviewerId: string | null;
    }>;
    update(companyId: string, id: string, dto: UpdatePerformanceReviewDto): Promise<{
        user: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        };
        reviewer: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        items: {
            name: string;
            type: import(".prisma/client").$Enums.PerformanceItemType;
            createdAt: Date;
            description: string | null;
            rating: import(".prisma/client").$Enums.PerformanceRating | null;
            updatedAt: Date;
            id: string;
            weight: import("@prisma/client/runtime/library").Decimal;
            targetValue: string | null;
            actualValue: string | null;
            score: import("@prisma/client/runtime/library").Decimal | null;
            comments: string | null;
            selfRating: import(".prisma/client").$Enums.PerformanceRating | null;
            selfScore: import("@prisma/client/runtime/library").Decimal | null;
            selfComments: string | null;
            reviewId: string;
        }[];
    } & {
        type: import(".prisma/client").$Enums.PerformanceReviewType;
        status: import(".prisma/client").$Enums.PerformanceReviewStatus;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        companyId: string;
        userId: string;
        title: string;
        periodStart: Date;
        periodEnd: Date;
        reviewDate: Date | null;
        overallRating: import(".prisma/client").$Enums.PerformanceRating | null;
        overallScore: import("@prisma/client/runtime/library").Decimal | null;
        achievements: string | null;
        areasToImprove: string | null;
        managerComments: string | null;
        employeeComments: string | null;
        developmentPlan: string | null;
        nextPeriodGoals: string | null;
        completedAt: Date | null;
        reviewerId: string | null;
    }>;
    remove(companyId: string, id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    submitForReview(companyId: string, id: string): Promise<{
        user: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        };
        reviewer: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        items: {
            name: string;
            type: import(".prisma/client").$Enums.PerformanceItemType;
            createdAt: Date;
            description: string | null;
            rating: import(".prisma/client").$Enums.PerformanceRating | null;
            updatedAt: Date;
            id: string;
            weight: import("@prisma/client/runtime/library").Decimal;
            targetValue: string | null;
            actualValue: string | null;
            score: import("@prisma/client/runtime/library").Decimal | null;
            comments: string | null;
            selfRating: import(".prisma/client").$Enums.PerformanceRating | null;
            selfScore: import("@prisma/client/runtime/library").Decimal | null;
            selfComments: string | null;
            reviewId: string;
        }[];
    } & {
        type: import(".prisma/client").$Enums.PerformanceReviewType;
        status: import(".prisma/client").$Enums.PerformanceReviewStatus;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        companyId: string;
        userId: string;
        title: string;
        periodStart: Date;
        periodEnd: Date;
        reviewDate: Date | null;
        overallRating: import(".prisma/client").$Enums.PerformanceRating | null;
        overallScore: import("@prisma/client/runtime/library").Decimal | null;
        achievements: string | null;
        areasToImprove: string | null;
        managerComments: string | null;
        employeeComments: string | null;
        developmentPlan: string | null;
        nextPeriodGoals: string | null;
        completedAt: Date | null;
        reviewerId: string | null;
    }>;
    startReview(companyId: string, id: string): Promise<{
        user: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        };
        reviewer: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        items: {
            name: string;
            type: import(".prisma/client").$Enums.PerformanceItemType;
            createdAt: Date;
            description: string | null;
            rating: import(".prisma/client").$Enums.PerformanceRating | null;
            updatedAt: Date;
            id: string;
            weight: import("@prisma/client/runtime/library").Decimal;
            targetValue: string | null;
            actualValue: string | null;
            score: import("@prisma/client/runtime/library").Decimal | null;
            comments: string | null;
            selfRating: import(".prisma/client").$Enums.PerformanceRating | null;
            selfScore: import("@prisma/client/runtime/library").Decimal | null;
            selfComments: string | null;
            reviewId: string;
        }[];
    } & {
        type: import(".prisma/client").$Enums.PerformanceReviewType;
        status: import(".prisma/client").$Enums.PerformanceReviewStatus;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        companyId: string;
        userId: string;
        title: string;
        periodStart: Date;
        periodEnd: Date;
        reviewDate: Date | null;
        overallRating: import(".prisma/client").$Enums.PerformanceRating | null;
        overallScore: import("@prisma/client/runtime/library").Decimal | null;
        achievements: string | null;
        areasToImprove: string | null;
        managerComments: string | null;
        employeeComments: string | null;
        developmentPlan: string | null;
        nextPeriodGoals: string | null;
        completedAt: Date | null;
        reviewerId: string | null;
    }>;
    complete(companyId: string, id: string): Promise<{
        user: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        };
        reviewer: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        items: {
            name: string;
            type: import(".prisma/client").$Enums.PerformanceItemType;
            createdAt: Date;
            description: string | null;
            rating: import(".prisma/client").$Enums.PerformanceRating | null;
            updatedAt: Date;
            id: string;
            weight: import("@prisma/client/runtime/library").Decimal;
            targetValue: string | null;
            actualValue: string | null;
            score: import("@prisma/client/runtime/library").Decimal | null;
            comments: string | null;
            selfRating: import(".prisma/client").$Enums.PerformanceRating | null;
            selfScore: import("@prisma/client/runtime/library").Decimal | null;
            selfComments: string | null;
            reviewId: string;
        }[];
    } & {
        type: import(".prisma/client").$Enums.PerformanceReviewType;
        status: import(".prisma/client").$Enums.PerformanceReviewStatus;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        companyId: string;
        userId: string;
        title: string;
        periodStart: Date;
        periodEnd: Date;
        reviewDate: Date | null;
        overallRating: import(".prisma/client").$Enums.PerformanceRating | null;
        overallScore: import("@prisma/client/runtime/library").Decimal | null;
        achievements: string | null;
        areasToImprove: string | null;
        managerComments: string | null;
        employeeComments: string | null;
        developmentPlan: string | null;
        nextPeriodGoals: string | null;
        completedAt: Date | null;
        reviewerId: string | null;
    }>;
    cancel(companyId: string, id: string): Promise<{
        user: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        };
        reviewer: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        items: {
            name: string;
            type: import(".prisma/client").$Enums.PerformanceItemType;
            createdAt: Date;
            description: string | null;
            rating: import(".prisma/client").$Enums.PerformanceRating | null;
            updatedAt: Date;
            id: string;
            weight: import("@prisma/client/runtime/library").Decimal;
            targetValue: string | null;
            actualValue: string | null;
            score: import("@prisma/client/runtime/library").Decimal | null;
            comments: string | null;
            selfRating: import(".prisma/client").$Enums.PerformanceRating | null;
            selfScore: import("@prisma/client/runtime/library").Decimal | null;
            selfComments: string | null;
            reviewId: string;
        }[];
    } & {
        type: import(".prisma/client").$Enums.PerformanceReviewType;
        status: import(".prisma/client").$Enums.PerformanceReviewStatus;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        companyId: string;
        userId: string;
        title: string;
        periodStart: Date;
        periodEnd: Date;
        reviewDate: Date | null;
        overallRating: import(".prisma/client").$Enums.PerformanceRating | null;
        overallScore: import("@prisma/client/runtime/library").Decimal | null;
        achievements: string | null;
        areasToImprove: string | null;
        managerComments: string | null;
        employeeComments: string | null;
        developmentPlan: string | null;
        nextPeriodGoals: string | null;
        completedAt: Date | null;
        reviewerId: string | null;
    }>;
}
