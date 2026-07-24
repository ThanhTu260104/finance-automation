ALTER TABLE "departments"
  DROP CONSTRAINT IF EXISTS "departments_manager_id_fkey",
  DROP CONSTRAINT IF EXISTS "departments_secretary_id_fkey";

ALTER TABLE "departments"
  DROP COLUMN IF EXISTS "manager_id",
  DROP COLUMN IF EXISTS "secretary_id";
