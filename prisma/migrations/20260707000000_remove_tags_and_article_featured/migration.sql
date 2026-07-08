DROP TABLE IF EXISTS "article_tags";
DROP TABLE IF EXISTS "tags";
DROP INDEX IF EXISTS "articles_status_isFeatured_idx";
ALTER TABLE "articles" DROP COLUMN IF EXISTS "isFeatured";
