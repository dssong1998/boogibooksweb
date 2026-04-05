-- BoogiOut: community-planned outings (separate from Event)

CREATE TYPE "BoogiOutCostMode" AS ENUM ('TOTAL', 'PER_PERSON');
CREATE TYPE "BoogiOutSettlementMode" AS ENUM ('COMMISSION', 'COIN_GAIN');
CREATE TYPE "BoogiOutTimeMode" AS ENUM ('CONFIRMED', 'SET_TOGETHER');
CREATE TYPE "BoogiOutEventStatus" AS ENUM ('STANDBY', 'IN_PROGRESS', 'CLOSED_REGISTRATION', 'COMPLETED', 'CANCELLED');
CREATE TYPE "BoogiOutApplicationStatus" AS ENUM ('PENDING', 'AWAITING_PAYMENT', 'PAID', 'CANCELLED');

CREATE TABLE "BoogiOutEvent" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "costMode" "BoogiOutCostMode" NOT NULL,
    "costAmount" INTEGER NOT NULL,
    "feePercent" INTEGER NOT NULL DEFAULT 10,
    "settlementMode" "BoogiOutSettlementMode" NOT NULL,
    "maxParticipants" INTEGER,
    "timeMode" "BoogiOutTimeMode" NOT NULL,
    "eventDate" TIMESTAMP(3),
    "targetHeadcount" INTEGER,
    "dateSelectionMockupUrl" TEXT,
    "applicantResponseEnabled" BOOLEAN NOT NULL DEFAULT false,
    "applicantResponseLabel" TEXT,
    "afterPartyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "afterPartyBudgetPerPerson" INTEGER,
    "afterPartyTotalAmount" INTEGER,
    "afterPartyAccountNumber" TEXT,
    "afterPartySettledAt" TIMESTAMP(3),
    "promotionalImageUrl" TEXT,
    "paymentLink" TEXT,
    "status" "BoogiOutEventStatus" NOT NULL,
    "reminder3dAt" TIMESTAMP(3),
    "registrationClosesAt" TIMESTAMP(3),
    "reminder3dSentAt" TIMESTAMP(3),
    "registrationClosedAt" TIMESTAMP(3),
    "postCloseDmSentAt" TIMESTAMP(3),
    "headcountReachedNotifiedAt" TIMESTAMP(3),
    "discordPromoMessageId" TEXT,
    "discordThreadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoogiOutEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BoogiOutApplication" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "responseText" TEXT,
    "status" "BoogiOutApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "proofToken" TEXT NOT NULL DEFAULT (gen_random_uuid()::text),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoogiOutApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BoogiOutDiscordOutbox" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "eventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "BoogiOutDiscordOutbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BoogiOutApplication_proofToken_key" ON "BoogiOutApplication"("proofToken");
CREATE UNIQUE INDEX "BoogiOutApplication_eventId_userId_key" ON "BoogiOutApplication"("eventId", "userId");

CREATE INDEX "BoogiOutDiscordOutbox_status_createdAt_idx" ON "BoogiOutDiscordOutbox"("status", "createdAt");

ALTER TABLE "BoogiOutEvent" ADD CONSTRAINT "BoogiOutEvent_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BoogiOutApplication" ADD CONSTRAINT "BoogiOutApplication_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "BoogiOutEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BoogiOutApplication" ADD CONSTRAINT "BoogiOutApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BoogiOutDiscordOutbox" ADD CONSTRAINT "BoogiOutDiscordOutbox_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "BoogiOutEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
