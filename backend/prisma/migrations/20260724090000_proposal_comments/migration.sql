CREATE TABLE "proposal_comments" (
  "id" TEXT NOT NULL,
  "proposal_id" TEXT NOT NULL,
  "author_id" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "proposal_comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "proposal_comments_proposal_id_created_at_idx"
  ON "proposal_comments"("proposal_id", "created_at");
CREATE INDEX "proposal_comments_author_id_idx"
  ON "proposal_comments"("author_id");

ALTER TABLE "proposal_comments"
  ADD CONSTRAINT "proposal_comments_proposal_id_fkey"
  FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "proposal_comments"
  ADD CONSTRAINT "proposal_comments_author_id_fkey"
  FOREIGN KEY ("author_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
