CREATE TABLE "authors" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "bioRich" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "authors_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "authors_slug_key" ON "authors"("slug");
CREATE INDEX "authors_isActive_idx" ON "authors"("isActive");

INSERT INTO "authors" ("id", "name", "slug", "bioRich", "createdAt", "updatedAt")
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'Redazione Middleware',
  'redazione-middleware',
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"La redazione di Middleware cura collettivamente editoriali, posizionamenti e testi di indirizzo del progetto, con uno sguardo radicato su Modena, territorio, conflitto sociale e trasformazioni urbane."}]}]}'::jsonb,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT tc.constraint_name INTO constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = CURRENT_SCHEMA()
    AND tc.table_name = 'articles'
    AND kcu.column_name = 'authorId'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE FORMAT('ALTER TABLE "articles" DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE "articles" ALTER COLUMN "authorId" DROP NOT NULL;

UPDATE "articles"
SET "authorId" = NULL;

UPDATE "articles"
SET "authorId" = '00000000-0000-4000-8000-000000000001'
WHERE LOWER("slug") IN ('editoriale', 'editorial')
  OR LOWER("title") = 'editoriale'
  OR "categoryId" IN (
    SELECT "id"
    FROM "categories"
    WHERE LOWER("slug") IN ('editoriale', 'editorial')
      OR LOWER("name") = 'editoriale'
  );

ALTER TABLE "articles"
ADD CONSTRAINT "articles_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "authors"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
