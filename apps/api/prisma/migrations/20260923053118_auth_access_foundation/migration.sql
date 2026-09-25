-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "amountMinor" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'PKR';

-- AddForeignKey
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_proofAssetId_fkey" FOREIGN KEY ("proofAssetId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
