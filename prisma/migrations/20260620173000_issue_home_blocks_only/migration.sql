ALTER TABLE "issues" ADD COLUMN IF NOT EXISTS "homeBlocks" JSONB;

DROP INDEX IF EXISTS "articles_issueId_homeRole_homeWeight_idx";
ALTER TABLE "articles" DROP COLUMN IF EXISTS "homeRole";
ALTER TABLE "articles" DROP COLUMN IF EXISTS "homeWeight";
ALTER TABLE "articles" DROP COLUMN IF EXISTS "homeGroup";

DROP TYPE IF EXISTS "ArticleHomeRole";
DROP TYPE IF EXISTS "ArticleHomeWeight";
