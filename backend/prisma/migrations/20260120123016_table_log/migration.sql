/*
  Warnings:

  - The values [ANNUAL_MEMBER] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('VISITOR', 'MEMBER', 'ADMIN');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'VISITOR';
COMMIT;

-- CreateTable
CREATE TABLE "TableLog" (
    "id" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "channelName" TEXT,
    "messageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TableLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TableLog_messageId_key" ON "TableLog"("messageId");

-- CreateIndex
CREATE INDEX "TableLog_discordUserId_idx" ON "TableLog"("discordUserId");

-- CreateIndex
CREATE INDEX "TableLog_date_idx" ON "TableLog"("date");
