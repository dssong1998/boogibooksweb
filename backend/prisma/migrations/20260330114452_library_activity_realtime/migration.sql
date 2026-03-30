-- AlterEnum
ALTER TYPE "EventType" ADD VALUE 'BOOGITOUT';

-- CreateTable
CREATE TABLE "LibraryActivityMonth" (
    "id" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "hasActivity" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryActivityMonth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibraryActivityAck" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LibraryActivityAck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LibraryActivityMonth_discordUserId_idx" ON "LibraryActivityMonth"("discordUserId");

-- CreateIndex
CREATE UNIQUE INDEX "LibraryActivityMonth_discordUserId_year_month_key" ON "LibraryActivityMonth"("discordUserId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "LibraryActivityAck_sourceId_key" ON "LibraryActivityAck"("sourceId");
