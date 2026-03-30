-- Add Discord linkage fields for forum backfill/listener

ALTER TABLE "Book" ADD COLUMN "discordThreadId" TEXT;
CREATE UNIQUE INDEX "Book_discordThreadId_key" ON "Book"("discordThreadId");

ALTER TABLE "Comment" ADD COLUMN "discordMessageId" TEXT;
CREATE UNIQUE INDEX "Comment_discordMessageId_key" ON "Comment"("discordMessageId");

