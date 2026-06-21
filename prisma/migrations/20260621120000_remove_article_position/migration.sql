DROP INDEX IF EXISTS "articles_issueId_position_idx";
ALTER TABLE "articles" DROP COLUMN IF EXISTS "position";
CREATE INDEX IF NOT EXISTS "articles_issueId_publishedAt_idx" ON "articles"("issueId", "publishedAt");
