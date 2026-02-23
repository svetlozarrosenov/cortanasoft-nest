-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN     "expiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "chat_messages_expiresAt_idx" ON "chat_messages"("expiresAt");
