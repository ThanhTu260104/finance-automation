UPDATE "roles"
SET "permissions" = array_append("permissions", 'proposal.view_all')
WHERE "code" = 'ADMIN'
  AND NOT ('proposal.view_all' = ANY("permissions"));
