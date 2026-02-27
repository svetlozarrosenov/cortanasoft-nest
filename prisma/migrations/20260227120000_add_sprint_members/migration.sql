-- AlterTable
ALTER TABLE "sprints" DROP COLUMN "workersCount";

-- CreateTable
CREATE TABLE "sprint_members" (
    "id" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sprintId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "sprint_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sprint_members_sprintId_idx" ON "sprint_members"("sprintId");

-- CreateIndex
CREATE INDEX "sprint_members_userId_idx" ON "sprint_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "sprint_members_sprintId_userId_key" ON "sprint_members"("sprintId", "userId");

-- AddForeignKey
ALTER TABLE "sprint_members" ADD CONSTRAINT "sprint_members_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "sprints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sprint_members" ADD CONSTRAINT "sprint_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sprint_members" ADD CONSTRAINT "sprint_members_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
