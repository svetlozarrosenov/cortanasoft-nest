-- CreateEnum
CREATE TYPE "PerformanceReviewType" AS ENUM ('PROBATION', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL', 'PROJECT', 'SELF_ASSESSMENT');

-- CreateEnum
CREATE TYPE "PerformanceReviewStatus" AS ENUM ('DRAFT', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PerformanceRating" AS ENUM ('EXCEPTIONAL', 'EXCEEDS', 'MEETS', 'NEEDS_IMPROVEMENT', 'UNSATISFACTORY');

-- CreateEnum
CREATE TYPE "PerformanceItemType" AS ENUM ('KPI', 'COMPETENCY', 'GOAL', 'BEHAVIOR');

-- CreateTable
CREATE TABLE "performance_reviews" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "PerformanceReviewType" NOT NULL,
    "status" "PerformanceReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "reviewDate" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "overallRating" "PerformanceRating",
    "overallScore" DECIMAL(3,2),
    "achievements" TEXT,
    "areasToImprove" TEXT,
    "managerComments" TEXT,
    "employeeComments" TEXT,
    "developmentPlan" TEXT,
    "nextPeriodGoals" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "performance_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_review_items" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "type" "PerformanceItemType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "weight" DECIMAL(5,2) NOT NULL DEFAULT 1,
    "targetValue" TEXT,
    "actualValue" TEXT,
    "rating" "PerformanceRating",
    "score" DECIMAL(3,2),
    "comments" TEXT,
    "selfRating" "PerformanceRating",
    "selfScore" DECIMAL(3,2),
    "selfComments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_review_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "performance_reviews_companyId_status_idx" ON "performance_reviews"("companyId", "status");

-- CreateIndex
CREATE INDEX "performance_reviews_companyId_userId_idx" ON "performance_reviews"("companyId", "userId");

-- CreateIndex
CREATE INDEX "performance_reviews_companyId_reviewerId_idx" ON "performance_reviews"("companyId", "reviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "performance_reviews_companyId_userId_periodStart_periodEnd__key" ON "performance_reviews"("companyId", "userId", "periodStart", "periodEnd", "type");

-- CreateIndex
CREATE INDEX "performance_review_items_reviewId_idx" ON "performance_review_items"("reviewId");

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_review_items" ADD CONSTRAINT "performance_review_items_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "performance_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
