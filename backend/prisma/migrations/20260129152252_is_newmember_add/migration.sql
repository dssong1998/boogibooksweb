-- AlterTable
ALTER TABLE "Digging" ADD COLUMN     "hashtags" TEXT[],
ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "EventApplication" ADD COLUMN     "isNewMember" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isNewMember" BOOLEAN NOT NULL DEFAULT false;
