-- CreateEnum
CREATE TYPE "EventApplicationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'WAITLIST', 'CANCELLED');

-- CreateTable
CREATE TABLE "EventApplication" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicationOrder" INTEGER NOT NULL,
    "status" "EventApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "usedCoins" INTEGER NOT NULL DEFAULT 0,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventApplication_eventId_userId_key" ON "EventApplication"("eventId", "userId");

-- AddForeignKey
ALTER TABLE "EventApplication" ADD CONSTRAINT "EventApplication_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
