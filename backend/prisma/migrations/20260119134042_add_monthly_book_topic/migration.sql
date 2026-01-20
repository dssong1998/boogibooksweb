-- DropIndex
DROP INDEX "MonthlyBook_year_month_key";

-- AlterTable
ALTER TABLE "MonthlyBook" ADD COLUMN     "topic" TEXT;

-- CreateIndex
CREATE INDEX "MonthlyBook_year_month_idx" ON "MonthlyBook"("year", "month");
