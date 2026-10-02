-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_verified_at" TIMESTAMPTZ(3);

-- Accounts created before email verification existed are treated as verified,
-- so that they are not locked out by the new login rule.
UPDATE "users" SET "email_verified_at" = "created_at";
