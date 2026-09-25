CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'RESTRICTED');
CREATE TYPE "VerificationStatus" AS ENUM ('NOT_REVIEWED', 'PENDING', 'VERIFIED', 'REJECTED');

CREATE TABLE "Customer" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "userId" TEXT,
  "fullName" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT NOT NULL,
  "address" TEXT,
  "notes" TEXT,
  "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
  "verification" "VerificationStatus" NOT NULL DEFAULT 'NOT_REVIEWED',
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Driver" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "licenseNumber" TEXT,
  "licenseCountry" TEXT,
  "licenseExpiresAt" TIMESTAMP(3),
  "verification" "VerificationStatus" NOT NULL DEFAULT 'NOT_REVIEWED',
  "notes" TEXT,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Customer_id_businessId_key" ON "Customer"("id", "businessId");
CREATE UNIQUE INDEX "Customer_businessId_userId_key" ON "Customer"("businessId", "userId");
CREATE UNIQUE INDEX "Customer_businessId_email_key" ON "Customer"("businessId", "email");
CREATE INDEX "Customer_businessId_archivedAt_fullName_idx" ON "Customer"("businessId", "archivedAt", "fullName");
CREATE INDEX "Customer_businessId_phone_idx" ON "Customer"("businessId", "phone");
CREATE INDEX "Driver_businessId_customerId_archivedAt_idx" ON "Driver"("businessId", "customerId", "archivedAt");
CREATE INDEX "Driver_businessId_licenseNumber_idx" ON "Driver"("businessId", "licenseNumber");

ALTER TABLE "Customer" ADD CONSTRAINT "Customer_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_customerId_businessId_fkey" FOREIGN KEY ("customerId", "businessId") REFERENCES "Customer"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;
