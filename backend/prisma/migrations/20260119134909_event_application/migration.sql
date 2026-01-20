/*
  Warnings:

  - You are about to drop the column `currentParticipants` on the `Event` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Event" DROP COLUMN "currentParticipants";

-- AddForeignKey
ALTER TABLE "EventApplication" ADD CONSTRAINT "EventApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
