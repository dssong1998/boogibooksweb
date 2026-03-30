-- LibraryActivityAck: 이벤트 자격 충족 여부(봇이 판단)
ALTER TABLE "LibraryActivityAck" ADD COLUMN "isValidForEvent" BOOLEAN NOT NULL DEFAULT false;

-- LibraryActivityMonth: 전체 건수 + 이벤트 자격 건수 분리
ALTER TABLE "LibraryActivityMonth" ADD COLUMN "validForEventCount" INTEGER NOT NULL DEFAULT 0;

-- 기존 데이터: hasActivity가 true였던 월은 기존 messageCount를 valid로 간주(당시 로직은 유효만 집계)
UPDATE "LibraryActivityMonth"
SET "validForEventCount" = "messageCount"
WHERE "hasActivity" = true;

ALTER TABLE "LibraryActivityMonth" DROP COLUMN "hasActivity";
