ALTER TABLE "maps"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "publishedAt" TIMESTAMP(3);

CREATE INDEX "maps_isActive_publishedAt_idx" ON "maps"("isActive", "publishedAt");
