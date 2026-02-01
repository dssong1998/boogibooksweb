/*
  Warnings:

  - You are about to drop the column `hashtags` on the `Digging` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Digging" DROP COLUMN "hashtags",
ADD COLUMN     "thumbnail" TEXT;
