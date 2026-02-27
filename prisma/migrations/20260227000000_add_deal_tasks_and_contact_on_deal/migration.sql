-- AlterTable
ALTER TABLE "deals" ADD COLUMN     "contactId" TEXT;

-- CreateTable
CREATE TABLE "deal_tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dealId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "createdById" TEXT,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "deal_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deal_tasks_dealId_idx" ON "deal_tasks"("dealId");

-- CreateIndex
CREATE INDEX "deal_tasks_companyId_dealId_idx" ON "deal_tasks"("companyId", "dealId");

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_tasks" ADD CONSTRAINT "deal_tasks_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_tasks" ADD CONSTRAINT "deal_tasks_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_tasks" ADD CONSTRAINT "deal_tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_tasks" ADD CONSTRAINT "deal_tasks_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
