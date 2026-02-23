export declare enum PerformanceReviewStatus {
    DRAFT = "DRAFT",
    PENDING = "PENDING",
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
}
export declare class QueryPerformanceReviewDto {
    search?: string;
    status?: PerformanceReviewStatus;
    type?: string;
    userId?: string;
    reviewerId?: string;
    periodFrom?: string;
    periodTo?: string;
    year?: number;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
