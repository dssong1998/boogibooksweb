-- AlterTable: 뒷풀이 없는 이벤트 신청은 null
ALTER TABLE "BoogiOutApplication" ALTER COLUMN "afterPartyOptIn" DROP DEFAULT;
ALTER TABLE "BoogiOutApplication" ALTER COLUMN "afterPartyOptIn" DROP NOT NULL;

UPDATE "BoogiOutApplication" AS a
SET "afterPartyOptIn" = NULL
FROM "BoogiOutEvent" AS e
WHERE a."eventId" = e."id" AND e."afterPartyEnabled" = false;
