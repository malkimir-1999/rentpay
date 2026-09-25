-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "isPurchasable" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SubscriptionPayment" ADD COLUMN     "requestedPlanId" TEXT;

-- CreateIndex
CREATE INDEX "SubscriptionPayment_status_createdAt_idx" ON "SubscriptionPayment"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_requestedPlanId_fkey" FOREIGN KEY ("requestedPlanId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
