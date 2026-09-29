ALTER TYPE "InspectionStage" ADD VALUE 'MAINTENANCE_RELEASE';

ALTER TABLE "VehicleInspection" ADD COLUMN "maintenanceWorkOrderId" TEXT;

CREATE INDEX "VehicleInspection_businessId_maintenanceWorkOrderId_completedAt_idx"
  ON "VehicleInspection"("businessId", "maintenanceWorkOrderId", "completedAt");

ALTER TABLE "VehicleInspection" ADD CONSTRAINT "VehicleInspection_maintenanceWorkOrderId_businessId_fkey"
  FOREIGN KEY ("maintenanceWorkOrderId", "businessId") REFERENCES "MaintenanceWorkOrder"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
