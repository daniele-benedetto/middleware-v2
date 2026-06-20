DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ArticleHomeRole') THEN
    CREATE TYPE "ArticleHomeRole" AS ENUM ('NONE', 'LEAD', 'CORE', 'BREAK', 'SEQUENCE', 'CLOSING');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ArticleHomeWeight') THEN
    CREATE TYPE "ArticleHomeWeight" AS ENUM ('TERTIARY', 'SECONDARY', 'PRIMARY');
  END IF;
END $$;

ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "homeRole" "ArticleHomeRole" NOT NULL DEFAULT 'NONE';
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "homeWeight" "ArticleHomeWeight" NOT NULL DEFAULT 'SECONDARY';
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "homeGroup" TEXT;

CREATE INDEX IF NOT EXISTS "articles_issueId_homeRole_homeWeight_idx"
ON "articles"("issueId", "homeRole", "homeWeight");

ALTER TABLE "issues" DROP COLUMN IF EXISTS "homeLayout";
DROP TYPE IF EXISTS "IssueHomeLayout";
