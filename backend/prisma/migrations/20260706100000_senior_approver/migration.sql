-- AlterTable
ALTER TABLE "approval_workflow_steps" ADD COLUMN "is_senior_approver" BOOLEAN NOT NULL DEFAULT false;

-- Mark existing step-2 / supreme-approver steps as senior approvers
UPDATE "approval_workflow_steps"
SET "is_senior_approver" = true
WHERE "step_order" = 2
   OR "label" = 'Quyền tối cao'
   OR "label" = 'Người duyệt cấp cao';
