CREATE TYPE "MaintenanceStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TABLE "MaintenanceWorkOrder" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'PLANNED',
    "dueAt" TIMESTAMP(3),
    "dueOdometerKm" INTEGER,
    "scheduledStartAt" TIMESTAMP(3),
    "expectedEndAt" TIMESTAMP(3),
    "blocksAvailability" BOOLEAN NOT NULL DEFAULT true,
    "vendorName" TEXT,
    "estimatedCostMinor" INTEGER,
    "actualCostMinor" INTEGER,
    "currency" TEXT NOT NULL,
    "completionNotes" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MaintenanceWorkOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MaintenanceWorkOrder_id_businessId_key" ON "MaintenanceWorkOrder"("id", "businessId");
CREATE INDEX "MaintenanceWorkOrder_businessId_status_dueAt_idx" ON "MaintenanceWorkOrder"("businessId", "status", "dueAt");
CREATE INDEX "MaintenanceWorkOrder_businessId_vehicleId_status_scheduledStartAt_expectedEndAt_idx" ON "MaintenanceWorkOrder"("businessId", "vehicleId", "status", "scheduledStartAt", "expectedEndAt");

ALTER TABLE "MaintenanceWorkOrder" ADD CONSTRAINT "MaintenanceWorkOrder_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaintenanceWorkOrder" ADD CONSTRAINT "MaintenanceWorkOrder_vehicleId_businessId_fkey"
  FOREIGN KEY ("vehicleId", "businessId") REFERENCES "Vehicle"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaintenanceWorkOrder" ADD CONSTRAINT "MaintenanceWorkOrder_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
