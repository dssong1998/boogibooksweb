-- AlterTable
ALTER TABLE "Room" ADD COLUMN "captainDiscordActivatedAt" TIMESTAMP(3);

-- 방장은 Room.captainId만 사용하고, 예전 CAPTAIN 행은 정원 집계에서 제외하기 위해 MEMBER로 통일
UPDATE "RoomMember" SET role = 'MEMBER' WHERE role = 'CAPTAIN';
