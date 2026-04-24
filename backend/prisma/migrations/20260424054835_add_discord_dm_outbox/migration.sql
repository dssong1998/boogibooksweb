-- CreateTable
CREATE TABLE "DiscordDmOutbox" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'EMBED_DM',
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "DiscordDmOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiscordDmOutbox_status_createdAt_idx" ON "DiscordDmOutbox"("status", "createdAt");
