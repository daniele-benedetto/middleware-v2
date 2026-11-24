ALTER TABLE "global_search_documents" ADD COLUMN "meta" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
