CREATE TABLE "user_departments" (
    "user_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_departments_pkey" PRIMARY KEY ("user_id", "department_id")
);

CREATE INDEX "user_departments_department_id_idx" ON "user_departments"("department_id");

ALTER TABLE "user_departments"
ADD CONSTRAINT "user_departments_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_departments"
ADD CONSTRAINT "user_departments_department_id_fkey"
FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "user_departments" ("user_id", "department_id")
SELECT "id", "department_id"
FROM "users"
WHERE "department_id" IS NOT NULL
ON CONFLICT ("user_id", "department_id") DO NOTHING;
