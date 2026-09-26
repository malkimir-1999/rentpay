CREATE TYPE "InspectionStage" AS ENUM ('PRE_HANDOVER', 'RETURN');
CREATE TYPE "DamageStatus" AS ENUM ('OPEN', 'QUOTED', 'RESOLVED', 'WAIVED');

CREATE TABLE "VehicleInspection" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "rentalId" TEXT,
  "stage" "InspectionStage" NOT NULL,
  "checklist" JSONB NOT NULL,
  "notes" TEXT,
  "odometerKm" INTEGER NOT NULL,
  "fuelPercent" INTEGER NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VehicleInspection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VehicleInspection_odometer_check" CHECK ("odometerKm" >= 0),
  CONSTRAINT "VehicleInspection_fuel_check" CHECK ("fuelPercent" BETWEEN 0 AND 100)
);
CREATE UNIQUE INDEX "VehicleInspection_id_businessId_key" ON "VehicleInspection"("id", "businessId");
CREATE INDEX "VehicleInspection_businessId_vehicleId_completedAt_idx" ON "VehicleInspection"("businessId", "vehicleId", "completedAt");
CREATE INDEX "VehicleInspection_businessId_rentalId_stage_idx" ON "VehicleInspection"("businessId", "rentalId", "stage");
ALTER TABLE "VehicleInspection" ADD CONSTRAINT "VehicleInspection_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleInspection" ADD CONSTRAINT "VehicleInspection_vehicleId_businessId_fkey" FOREIGN KEY ("vehicleId", "businessId") REFERENCES "Vehicle"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleInspection" ADD CONSTRAINT "VehicleInspection_businessId_rentalId_fkey" FOREIGN KEY ("businessId", "rentalId") REFERENCES "Rental"("businessId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleInspection" ADD CONSTRAINT "VehicleInspection_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "InspectionEvidence" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "inspectionId" TEXT NOT NULL,
  "fileAssetId" TEXT NOT NULL,
  "caption" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InspectionEvidence_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FileAsset_id_businessId_key" ON "FileAsset"("id", "businessId");
CREATE UNIQUE INDEX "InspectionEvidence_businessId_inspectionId_fileAssetId_key" ON "InspectionEvidence"("businessId", "inspectionId", "fileAssetId");
CREATE INDEX "InspectionEvidence_businessId_inspectionId_createdAt_idx" ON "InspectionEvidence"("businessId", "inspectionId", "createdAt");
ALTER TABLE "InspectionEvidence" ADD CONSTRAINT "InspectionEvidence_businessId_inspectionId_fkey" FOREIGN KEY ("inspectionId", "businessId") REFERENCES "VehicleInspection"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InspectionEvidence" ADD CONSTRAINT "InspectionEvidence_fileAssetId_businessId_fkey" FOREIGN KEY ("fileAssetId", "businessId") REFERENCES "FileAsset"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "DamageCase" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "rentalId" TEXT,
  "inspectionId" TEXT,
  "title" VARCHAR(120) NOT NULL,
  "description" VARCHAR(2000) NOT NULL,
  "status" "DamageStatus" NOT NULL DEFAULT 'OPEN',
  "estimatedMinor" INTEGER,
  "finalMinor" INTEGER,
  "resolutionNotes" VARCHAR(1000),
  "resolvedAt" TIMESTAMP(3),
  "reportedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DamageCase_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DamageCase_estimatedMinor_check" CHECK ("estimatedMinor" IS NULL OR "estimatedMinor" >= 0),
  CONSTRAINT "DamageCase_finalMinor_check" CHECK ("finalMinor" IS NULL OR "finalMinor" >= 0)
);
CREATE UNIQUE INDEX "DamageCase_id_businessId_key" ON "DamageCase"("id", "businessId");
CREATE INDEX "DamageCase_businessId_status_createdAt_idx" ON "DamageCase"("businessId", "status", "createdAt");
CREATE INDEX "DamageCase_businessId_vehicleId_createdAt_idx" ON "DamageCase"("businessId", "vehicleId", "createdAt");
ALTER TABLE "DamageCase" ADD CONSTRAINT "DamageCase_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DamageCase" ADD CONSTRAINT "DamageCase_vehicleId_businessId_fkey" FOREIGN KEY ("vehicleId", "businessId") REFERENCES "Vehicle"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DamageCase" ADD CONSTRAINT "DamageCase_businessId_rentalId_fkey" FOREIGN KEY ("businessId", "rentalId") REFERENCES "Rental"("businessId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DamageCase" ADD CONSTRAINT "DamageCase_businessId_inspectionId_fkey" FOREIGN KEY ("businessId", "inspectionId") REFERENCES "VehicleInspection"("businessId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DamageCase" ADD CONSTRAINT "DamageCase_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
