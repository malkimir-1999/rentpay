-- Phase 2 setup profile and first-vehicle persistence.
ALTER TABLE "Business" ADD COLUMN "address" TEXT,
ADD COLUMN "country" TEXT NOT NULL DEFAULT 'PK',
ADD COLUMN "email" TEXT,
ADD COLUMN "phone" TEXT;

ALTER TABLE "BusinessSettings" ADD COLUMN "bookingMode" TEXT NOT NULL DEFAULT 'REQUEST_TO_BOOK',
ADD COLUMN "country" TEXT NOT NULL DEFAULT 'PK',
ADD COLUMN "defaultDepositMinor" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "depositRequired" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "enabledRentalPaymentMethods" TEXT[] NOT NULL DEFAULT ARRAY['CASH', 'BANK_TRANSFER']::TEXT[],
ADD COLUMN "lateReturnFeeMinor" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lateReturnGraceMinutes" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN "onboardingStep" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "publicBrandColor" TEXT NOT NULL DEFAULT '#EA5F14',
ADD COLUMN "publicWebsiteEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "rentalDurationModel" TEXT NOT NULL DEFAULT 'DAILY';

ALTER TABLE "Location" ADD COLUMN "address" TEXT,
ADD COLUMN "phone" TEXT;

ALTER TABLE "Plan" ADD COLUMN "features" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "staffLimit" INTEGER,
ADD COLUMN "vehicleLimit" INTEGER;

ALTER TABLE "User" ADD COLUMN "name" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN "termsVersion" TEXT;

CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "locationId" TEXT,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER,
    "registrationNumber" TEXT NOT NULL,
    "dailyRateMinor" INTEGER NOT NULL,
    "weeklyRateMinor" INTEGER,
    "monthlyRateMinor" INTEGER,
    "depositMinor" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Vehicle_businessId_createdAt_idx" ON "Vehicle"("businessId", "createdAt");
CREATE UNIQUE INDEX "Vehicle_businessId_registrationNumber_key" ON "Vehicle"("businessId", "registrationNumber");
CREATE UNIQUE INDEX "Location_businessId_name_key" ON "Location"("businessId", "name");

ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
