CREATE TABLE "RentalSettlement" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "rentalId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "rentalAmountMinor" INTEGER NOT NULL,
    "additionalChargesMinor" INTEGER NOT NULL DEFAULT 0,
    "paymentReceivedMinor" INTEGER NOT NULL,
    "depositRetainedMinor" INTEGER NOT NULL,
    "depositRefundedMinor" INTEGER NOT NULL,
    "note" TEXT,
    "settledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RentalSettlement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RentalSettlement_businessId_settledAt_idx" ON "RentalSettlement"("businessId", "settledAt");
CREATE UNIQUE INDEX "RentalSettlement_businessId_rentalId_key" ON "RentalSettlement"("businessId", "rentalId");

ALTER TABLE "RentalSettlement" ADD CONSTRAINT "RentalSettlement_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RentalSettlement" ADD CONSTRAINT "RentalSettlement_businessId_rentalId_fkey"
  FOREIGN KEY ("businessId", "rentalId") REFERENCES "Rental"("businessId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
