-- DropIndex
DROP INDEX "Notification_type_actorId_recipientId_key";

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "targetId" TEXT;
ALTER TABLE "Notification" ADD COLUMN "targetType" TEXT;

-- CreateIndex
CREATE INDEX "Notification_targetType_targetId_idx" ON "Notification"("targetType", "targetId");
