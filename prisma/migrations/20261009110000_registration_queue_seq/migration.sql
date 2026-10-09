-- Waitlist fairness: registered_at has millisecond precision, so two people
-- joining in the same millisecond tied and were ordered by a random uuid.
-- `seq` comes from a sequence assigned at insert time. Waitlist inserts hold
-- the workshop row lock, so sequence order is exactly queue order.

-- AlterTable
ALTER TABLE "registrations" ADD COLUMN     "seq" BIGSERIAL NOT NULL;

-- Backfill existing rows in the order they were registered, then continue the
-- sequence after the highest value.
UPDATE "registrations" r
SET "seq" = o.rn
FROM (SELECT "id", row_number() OVER (ORDER BY "registered_at", "id") AS rn FROM "registrations") o
WHERE r."id" = o."id";

SELECT setval(
  pg_get_serial_sequence('"registrations"', 'seq'),
  COALESCE((SELECT max("seq") FROM "registrations"), 0) + 1,
  false
);

-- CreateIndex
CREATE INDEX "registrations_workshop_id_status_seq_idx" ON "registrations"("workshop_id", "status", "seq");
