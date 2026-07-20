-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "can_create_proposal" BOOLEAN NOT NULL DEFAULT false,
    "can_approve" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

INSERT INTO "roles" ("id", "code", "name", "description", "is_active", "can_create_proposal", "can_approve", "sort_order", "created_at", "updated_at") VALUES
('cmroleadmin00000000000001', 'ADMIN', 'Quản trị viên', 'Toàn quyền hệ thống', true, true, true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cmrolemanager000000000002', 'MANAGER', 'Quản lý', 'Quản lý phòng ban', true, true, true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cmrolefinance000000000003', 'FINANCE', 'Kế toán', 'Phòng tài chính kế toán', true, true, true, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cmroleemployee0000000004', 'EMPLOYEE', 'Nhân viên', 'Nhân viên thông thường', true, true, false, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

ALTER TABLE "users" ADD COLUMN "role_id" TEXT;

UPDATE "users" SET "role_id" = 'cmroleadmin00000000000001' WHERE "role" = 'ADMIN';
UPDATE "users" SET "role_id" = 'cmrolemanager000000000002' WHERE "role" = 'MANAGER';
UPDATE "users" SET "role_id" = 'cmrolefinance000000000003' WHERE "role" = 'FINANCE';
UPDATE "users" SET "role_id" = 'cmroleemployee0000000004' WHERE "role" = 'EMPLOYEE';
UPDATE "users" SET "role_id" = 'cmroleemployee0000000004' WHERE "role_id" IS NULL;

ALTER TABLE "users" ALTER COLUMN "role_id" SET NOT NULL;

ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "users" DROP COLUMN "role";

DROP TYPE "UserRole";
