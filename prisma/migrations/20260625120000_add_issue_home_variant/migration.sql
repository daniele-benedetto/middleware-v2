ALTER TABLE "issues" ADD COLUMN "homeVariant" TEXT NOT NULL DEFAULT 'black';

WITH preferred_variants AS (
  SELECT
    i.id,
    COALESCE(
      (
        SELECT block->>'variant'
        FROM jsonb_array_elements(i."homeBlocks"::jsonb) AS block
        WHERE block->>'type' = 'opening'
          AND block->>'variant' IN ('black', 'red', 'default')
        LIMIT 1
      ),
      (
        SELECT block->>'variant'
        FROM jsonb_array_elements(i."homeBlocks"::jsonb) AS block
        WHERE block->>'variant' IN ('black', 'red', 'default')
        LIMIT 1
      ),
      'black'
    ) AS "homeVariant"
  FROM "issues" i
  WHERE jsonb_typeof(i."homeBlocks"::jsonb) = 'array'
)
UPDATE "issues" i
SET "homeVariant" = preferred_variants."homeVariant"
FROM preferred_variants
WHERE i.id = preferred_variants.id;
