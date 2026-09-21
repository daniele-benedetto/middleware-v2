CREATE TABLE "article_popularities" (
    "articleId" TEXT NOT NULL,
    "pageviews" INTEGER NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_popularities_pkey" PRIMARY KEY ("articleId")
);

CREATE INDEX "article_popularities_pageviews_idx" ON "article_popularities"("pageviews");

ALTER TABLE "article_popularities" ADD CONSTRAINT "article_popularities_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
