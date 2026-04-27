-- AlterTable
ALTER TABLE "Room" ADD COLUMN "firstMemberJoinedAt" TIMESTAMP(3);

-- 이미 멤버가 있는 방은 가장 오래된 MEMBER 행 시각으로 채움 (1시간 자동 초대 로직 기준점)
UPDATE "Room" AS r
SET "firstMemberJoinedAt" = sub.first_at
FROM (
  SELECT rm."roomId", MIN(rm."createdAt") AS first_at
  FROM "RoomMember" rm
  WHERE rm.role = 'MEMBER'::"RoomMemberRole"
  GROUP BY rm."roomId"
) AS sub
WHERE r.id = sub."roomId"
  AND r."firstMemberJoinedAt" IS NULL;
