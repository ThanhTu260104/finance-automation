ALTER TABLE "departments"
  ADD COLUMN "manager_id" TEXT,
  ADD COLUMN "secretary_id" TEXT;

ALTER TABLE "departments"
  ADD CONSTRAINT "departments_manager_id_fkey"
  FOREIGN KEY ("manager_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "departments"
  ADD CONSTRAINT "departments_secretary_id_fkey"
  FOREIGN KEY ("secretary_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "proposal_approval_steps"
  ADD COLUMN "is_senior_approver" BOOLEAN NOT NULL DEFAULT false;
