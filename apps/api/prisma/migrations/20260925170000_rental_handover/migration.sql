CREATE TYPE "RentalStatus" AS ENUM ('BOOKED', 'ACTIVE', 'RETURNED', 'CLOSED', 'CANCELLED');

CREATE TABLE "Rental" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "reservationId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "pickupLocationId" TEXT NOT NULL,
  "dropoffLocationId" TEXT,
  "actualReturnLocationId" TEXT,
  "status" "RentalStatus" NOT NULL DEFAULT 'BOOKED',
  "startAt" TIMESTAMP(3) NOT NULL,
  "expectedReturnAt" TIMESTAMP(3) NOT NULL,
  "actualReturnAt" TIMESTAMP(3),
  "dailyRateMinor" INTEGER NOT NULL,
  "estimatedTotalMinor" INTEGER NOT NULL,
  "depositMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "customerPhone" TEXT NOT NULL,
  "customerEmail" TEXT,
  "startOdometerKm" INTEGER,
  "endOdometerKm" INTEGER,
  "startFuelPercent" INTEGER,
  "endFuelPercent" INTEGER,
  "checkedOutAt" TIMESTAMP(3),
  "checkedInAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Rental_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Rental_expectedReturn_check" CHECK ("expectedReturnAt" > "startAt"),
  CONSTRAINT "Rental_startOdometer_check" CHECK ("startOdometerKm" IS NULL OR "startOdometerKm" >= 0),
  CONSTRAINT "Rental_endOdometer_check" CHECK ("endOdometerKm" IS NULL OR "endOdometerKm" >= 0),
  CONSTRAINT "Rental_odometer_order_check" CHECK ("startOdometerKm" IS NULL OR "endOdometerKm" IS NULL OR "endOdometerKm" >= "startOdometerKm"),
  CONSTRAINT "Rental_startFuel_check" CHECK ("startFuelPercent" IS NULL OR "startFuelPercent" BETWEEN 0 AND 100),
  CONSTRAINT "Rental_endFuel_check" CHECK ("endFuelPercent" IS NULL OR "endFuelPercent" BETWEEN 0 AND 100)
);

CREATE UNIQUE INDEX "Rental_businessId_id_key" ON "Rental"("businessId", "id");
CREATE UNIQUE INDEX "Rental_businessId_reservationId_key" ON "Rental"("businessId", "reservationId");
CREATE INDEX "Rental_businessId_status_expectedReturnAt_idx" ON "Rental"("businessId", "status", "expectedReturnAt");
CREATE INDEX "Rental_businessId_vehicleId_status_startAt_expectedReturnAt_idx" ON "Rental"("businessId", "vehicleId", "status", "startAt", "expectedReturnAt");
CREATE INDEX "Rental_businessId_customerId_createdAt_idx" ON "Rental"("businessId", "customerId", "createdAt");

ALTER TABLE "Rental" ADD CONSTRAINT "Rental_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Rental" ADD CONSTRAINT "Rental_businessId_reservationId_fkey" FOREIGN KEY ("businessId", "reservationId") REFERENCES "Reservation"("businessId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Rental" ADD CONSTRAINT "Rental_customerId_businessId_fkey" FOREIGN KEY ("customerId", "businessId") REFERENCES "Customer"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Rental" ADD CONSTRAINT "Rental_vehicleId_businessId_fkey" FOREIGN KEY ("vehicleId", "businessId") REFERENCES "Vehicle"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Rental" ADD CONSTRAINT "Rental_pickupLocationId_businessId_fkey" FOREIGN KEY ("pickupLocationId", "businessId") REFERENCES "Location"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Rental" ADD CONSTRAINT "Rental_dropoffLocationId_businessId_fkey" FOREIGN KEY ("dropoffLocationId", "businessId") REFERENCES "Location"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Rental" ADD CONSTRAINT "Rental_actualReturnLocationId_businessId_fkey" FOREIGN KEY ("actualReturnLocationId", "businessId") REFERENCES "Location"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
