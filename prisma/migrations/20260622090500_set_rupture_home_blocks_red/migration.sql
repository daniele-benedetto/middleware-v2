UPDATE "issues"
SET "homeBlocks" = (
  SELECT jsonb_agg(
    CASE
      WHEN block ->> 'type' = 'rupture' THEN jsonb_set(block, '{variant}', '"red"'::jsonb, true)
      ELSE block
    END
    ORDER BY position
  )
  FROM jsonb_array_elements("homeBlocks") WITH ORDINALITY AS blocks(block, position)
)
WHERE "homeBlocks" IS NOT NULL
  AND jsonb_typeof("homeBlocks") = 'array'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements("homeBlocks") AS block
    WHERE block ->> 'type' = 'rupture'
  );
