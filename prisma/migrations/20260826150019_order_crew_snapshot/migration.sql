-- CreateTable
CREATE TABLE "order_crew_members" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_crew_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_crew_members_orderId_idx" ON "order_crew_members"("orderId");

-- CreateIndex
CREATE INDEX "order_crew_members_userId_idx" ON "order_crew_members"("userId");

-- AddForeignKey
ALTER TABLE "order_crew_members" ADD CONSTRAINT "order_crew_members_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_crew_members" ADD CONSTRAINT "order_crew_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
