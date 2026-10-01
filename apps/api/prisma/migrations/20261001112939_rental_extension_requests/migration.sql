-- CreateEnum
CREATE TYPE "RentalExtensionRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'CANCELLED');

-- AlterTable
ALTER TABLE "DamageCase" ALTER COLUMN "title" SET DATA TYPE TEXT,
ALTER COLUMN "description" SET DATA TYPE TEXT,
ALTER COLUMN "resolutionNotes" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Location" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "RentalExtensionRequest" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "rentalId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "requestedReturnAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RentalExtensionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalExtensionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RentalExtensionRequest_businessId_status_createdAt_idx" ON "RentalExtensionRequest"("businessId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "RentalExtensionRequest_businessId_rentalId_status_idx" ON "RentalExtensionRequest"("businessId", "rentalId", "status");

-- CreateIndex
CREATE INDEX "RentalExtensionRequest_customerId_status_createdAt_idx" ON "RentalExtensionRequest"("customerId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RentalExtensionRequest_id_businessId_key" ON "RentalExtensionRequest"("id", "businessId");

-- RenameForeignKey
ALTER TABLE "InspectionEvidence" RENAME CONSTRAINT "InspectionEvidence_businessId_inspectionId_fkey" TO "InspectionEvidence_inspectionId_businessId_fkey";

-- AddForeignKey
ALTER TABLE "RentalExtensionRequest" ADD CONSTRAINT "RentalExtensionRequest_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalExtensionRequest" ADD CONSTRAINT "RentalExtensionRequest_businessId_rentalId_fkey" FOREIGN KEY ("businessId", "rentalId") REFERENCES "Rental"("businessId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalExtensionRequest" ADD CONSTRAINT "RentalExtensionRequest_customerId_businessId_fkey" FOREIGN KEY ("customerId", "businessId") REFERENCES "Customer"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalExtensionRequest" ADD CONSTRAINT "RentalExtensionRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalExtensionRequest" ADD CONSTRAINT "RentalExtensionRequest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "MaintenanceWorkOrder_businessId_vehicleId_status_scheduledStart" RENAME TO "MaintenanceWorkOrder_businessId_vehicleId_status_scheduledS_idx";

-- RenameIndex
ALTER INDEX "VehicleInspection_businessId_maintenanceWorkOrderId_completedAt" RENAME TO "VehicleInspection_businessId_maintenanceWorkOrderId_complet_idx";
