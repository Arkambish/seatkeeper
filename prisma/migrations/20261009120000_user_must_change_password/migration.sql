-- Accounts created or reset by an admin carry a temporary password. This flag
-- forces the person to choose their own on next sign-in (enforced by the API).
-- Existing accounts default to false so nobody already signed in is locked out.

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "must_change_password" BOOLEAN NOT NULL DEFAULT false;
