CREATE TYPE "VehicleCondition" AS ENUM ('READY', 'PREPARATION', 'MAINTENANCE', 'DAMAGED', 'OUT_OF_SERVICE');

ALTER TABLE "Vehicle"
ADD COLUMN "variant" TEXT,
ADD COLUMN "vin" TEXT,
ADD COLUMN "color" TEXT,
ADD COLUMN "category" TEXT,
ADD COLUMN "transmission" TEXT,
ADD COLUMN "fuelType" TEXT,
ADD COLUMN "seats" INTEGER,
ADD COLUMN "odometerKm" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "condition" "VehicleCondition" NOT NULL DEFAULT 'READY',
ADD COLUMN "notes" TEXT,
ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Vehicle_businessId_vin_key" ON "Vehicle"("businessId", "vin");
CREATE INDEX "Vehicle_businessId_condition_archivedAt_idx" ON "Vehicle"("businessId", "condition", "archivedAt");
