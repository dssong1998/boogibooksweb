-- Add libraryMessageCount and approvedAt columns to EventApplication
ALTER TABLE "EventApplication" ADD COLUMN IF NOT EXISTS "libraryMessageCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EventApplication" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);

-- Update EventApplicationStatus enum
-- First, create a new enum type
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'eventapplicationstatus_new') THEN
        CREATE TYPE "EventApplicationStatus_new" AS ENUM ('PENDING', 'APPROVED', 'CONFIRMED', 'COIN_GUARANTEED', 'CANCELLED');
    END IF;
END $$;

-- Update existing WAITLIST values to PENDING (if any)
UPDATE "EventApplication" SET "status" = 'PENDING' WHERE "status" = 'WAITLIST';

-- Alter the column to use the new enum
ALTER TABLE "EventApplication" 
    ALTER COLUMN "status" DROP DEFAULT,
    ALTER COLUMN "status" TYPE "EventApplicationStatus_new" USING ("status"::text::"EventApplicationStatus_new"),
    ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- Drop the old enum and rename the new one
DROP TYPE IF EXISTS "EventApplicationStatus";
ALTER TYPE "EventApplicationStatus_new" RENAME TO "EventApplicationStatus";
