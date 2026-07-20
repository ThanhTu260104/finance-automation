ALTER TABLE "proposals" ADD COLUMN "paid_at" TIMESTAMP(3);

UPDATE "proposals"
SET "paid_at" = "updated_at"
WHERE "status" = 'PAID' AND "paid_at" IS NULL;
