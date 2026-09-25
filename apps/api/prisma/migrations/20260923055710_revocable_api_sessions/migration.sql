-- CreateTable
CREATE TABLE "ApiSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiSession_tokenId_key" ON "ApiSession"("tokenId");

-- CreateIndex
CREATE INDEX "ApiSession_userId_expiresAt_idx" ON "ApiSession"("userId", "expiresAt");

-- AddForeignKey
ALTER TABLE "ApiSession" ADD CONSTRAINT "ApiSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
