CREATE TABLE "global_search_documents" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "href" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "sourceFingerprint" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "searchVector" tsvector GENERATED ALWAYS AS (
      setweight(to_tsvector('italian', coalesce("title", '')), 'A') ||
      setweight(to_tsvector('italian', coalesce("body", '')), 'B')
    ) STORED,
    CONSTRAINT "global_search_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "global_search_documents_sourceType_sourceId_idx"
  ON "global_search_documents"("sourceType", "sourceId");

CREATE INDEX "global_search_documents_searchVector_idx"
  ON "global_search_documents" USING GIN ("searchVector");
