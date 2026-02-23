export declare enum PerformanceReviewType {
    PROBATION = "PROBATION",
    QUARTERLY = "QUARTERLY",
    SEMI_ANNUAL = "SEMI_ANNUAL",
    ANNUAL = "ANNUAL",
    PROJECT = "PROJECT",
    SELF_ASSESSMENT = "SELF_ASSESSMENT"
}
export declare enum PerformanceRating {
    EXCEPTIONAL = "EXCEPTIONAL",
    EXCEEDS = "EXCEEDS",
    MEETS = "MEETS",
    NEEDS_IMPROVEMENT = "NEEDS_IMPROVEMENT",
    UNSATISFACTORY = "UNSATISFACTORY"
}
export declare enum PerformanceItemType {
    KPI = "KPI",
    COMPETENCY = "COMPETENCY",
    GOAL = "GOAL",
    BEHAVIOR = "BEHAVIOR"
}
export declare class CreatePerformanceReviewItemDto {
    type: PerformanceItemType;
    name: string;
    description?: string;
    weight?: number;
    targetValue?: string;
    actualValue?: string;
    rating?: PerformanceRating;
    score?: number;
    comments?: string;
    selfRating?: PerformanceRating;
    selfScore?: number;
    selfComments?: string;
}
export declare class CreatePerformanceReviewDto {
    title: string;
    type: PerformanceReviewType;
    periodStart: string;
    periodEnd: string;
    reviewDate?: string;
    userId: string;
    reviewerId?: string;
    overallRating?: PerformanceRating;
    overallScore?: number;
    achievements?: string;
    areasToImprove?: string;
    managerComments?: string;
    employeeComments?: string;
    developmentPlan?: string;
    nextPeriodGoals?: string;
    items?: CreatePerformanceReviewItemDto[];
}
