ALTER TABLE "Location"
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DROP INDEX "Location_businessId_idx";
CREATE INDEX "Location_businessId_archivedAt_idx" ON "Location"("businessId", "archivedAt");
