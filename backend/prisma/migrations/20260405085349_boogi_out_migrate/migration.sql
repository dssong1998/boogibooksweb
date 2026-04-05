-- DropIndex
DROP INDEX "BoogiOutDiscordOutbox_status_createdAt_idx";

-- AlterTable
ALTER TABLE "BoogiOutApplication" ALTER COLUMN "proofToken" DROP DEFAULT;
