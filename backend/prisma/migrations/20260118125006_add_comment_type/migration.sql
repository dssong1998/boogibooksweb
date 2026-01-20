-- CreateEnum
CREATE TYPE "CommentType" AS ENUM ('PREVIEW', 'REVIEW', 'QUOTE');

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "type" "CommentType" NOT NULL DEFAULT 'REVIEW';
