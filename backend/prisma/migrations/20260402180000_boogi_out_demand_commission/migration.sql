-- 수요 인원, 커미션 정산용 은행/계좌
ALTER TABLE "BoogiOutEvent" ADD COLUMN "demandParticipants" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "BoogiOutEvent" ADD COLUMN "commissionBankName" TEXT;
ALTER TABLE "BoogiOutEvent" ADD COLUMN "commissionAccountNumber" TEXT;
