ALTER TABLE "proposals" ALTER COLUMN "status" DROP DEFAULT;

ALTER TYPE "ProposalStatus" RENAME TO "ProposalStatus_old";

CREATE TYPE "ProposalStatus" AS ENUM (
    'DRAFT',
    'PENDING',
    'APPROVED',
    'PENDING_PAYMENT',
    'PAID',
    'REJECTED',
    'CANCELLED'
);

ALTER TABLE "proposals"
ALTER COLUMN "status" TYPE "ProposalStatus"
USING (
    CASE
        WHEN "status"::text = 'APPROVED' THEN 'PENDING_PAYMENT'
        ELSE "status"::text
    END::"ProposalStatus"
);

ALTER TABLE "proposals" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

DROP TYPE "ProposalStatus_old";

UPDATE "roles"
SET "permissions" = array_append("permissions", 'proposal.pay')
WHERE "code" IN ('ADMIN', 'FINANCE')
  AND NOT ("permissions" @> ARRAY['proposal.pay']);
