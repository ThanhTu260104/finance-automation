-- CreateTable
CREATE TABLE "approval_workflow_participants" (
    "id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "ParticipantRole" NOT NULL,

    CONSTRAINT "approval_workflow_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "approval_workflow_participants_workflow_id_user_id_role_key" ON "approval_workflow_participants"("workflow_id", "user_id", "role");

-- AddForeignKey
ALTER TABLE "approval_workflow_participants" ADD CONSTRAINT "approval_workflow_participants_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "approval_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_workflow_participants" ADD CONSTRAINT "approval_workflow_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
