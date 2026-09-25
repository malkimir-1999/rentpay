CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'READY_FOR_PICKUP', 'CONVERTED_TO_RENTAL', 'CANCELLED', 'DECLINED', 'NO_SHOW', 'EXPIRED');
CREATE TYPE "ReservationSource" AS ENUM ('STAFF', 'PUBLIC');

CREATE TABLE "Reservation" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "pickupLocationId" TEXT NOT NULL,
  "dropoffLocationId" TEXT,
  "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
  "source" "ReservationSource" NOT NULL DEFAULT 'STAFF',
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "dailyRateMinor" INTEGER NOT NULL,
  "estimatedTotalMinor" INTEGER NOT NULL,
  "depositMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "customerPhone" TEXT NOT NULL,
  "customerEmail" TEXT,
  "notes" TEXT,
  "statusReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Location_id_businessId_key" ON "Location"("id", "businessId");
CREATE UNIQUE INDEX "Vehicle_id_businessId_key" ON "Vehicle"("id", "businessId");
CREATE UNIQUE INDEX "Reservation_businessId_id_key" ON "Reservation"("businessId", "id");
CREATE INDEX "Reservation_businessId_status_startAt_idx" ON "Reservation"("businessId", "status", "startAt");
CREATE INDEX "Reservation_businessId_vehicleId_status_startAt_endAt_idx" ON "Reservation"("businessId", "vehicleId", "status", "startAt", "endAt");
CREATE INDEX "Reservation_businessId_customerId_createdAt_idx" ON "Reservation"("businessId", "customerId", "createdAt");

ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_customerId_businessId_fkey" FOREIGN KEY ("customerId", "businessId") REFERENCES "Customer"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_vehicleId_businessId_fkey" FOREIGN KEY ("vehicleId", "businessId") REFERENCES "Vehicle"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_pickupLocationId_businessId_fkey" FOREIGN KEY ("pickupLocationId", "businessId") REFERENCES "Location"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_dropoffLocationId_businessId_fkey" FOREIGN KEY ("dropoffLocationId", "businessId") REFERENCES "Location"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
