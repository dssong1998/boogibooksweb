/*
  Warnings:

  - You are about to drop the column `attendanceRate` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `eventsParticipated` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `totalBooksRead` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `voiceChannelDays` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `voiceChannelMinutes` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "attendanceRate",
DROP COLUMN "eventsParticipated",
DROP COLUMN "totalBooksRead",
DROP COLUMN "voiceChannelDays",
DROP COLUMN "voiceChannelMinutes";
