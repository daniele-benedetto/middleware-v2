INSERT INTO
  "pages" (
    "id",
    "title",
    "slug",
    "status",
    "contentRich",
    "publishedAt",
    "createdAt",
    "updatedAt"
  )
VALUES
  (
    '2d1d1b4c-2af0-4e6f-9e2e-0e2a3db19101',
    'Chi siamo',
    'chi-siamo',
    'PUBLISHED',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Middleware e un laboratorio editoriale indipendente dedicato all''inchiesta, alla critica e alla ricerca politica."}]},{"type":"paragraph","content":[{"type":"text","text":"Questa pagina e una base iniziale: aggiorna dal CMS missione, redazione, contatti e informazioni istituzionali."}]}]}'::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    '3a3afaf2-a0d6-48f2-8518-8a5d73e4a102',
    'Cookie policy',
    'cookie-policy',
    'PUBLISHED',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Questa cookie policy descrive l''uso dei cookie e di tecnologie simili sul sito Middleware."}]},{"type":"paragraph","content":[{"type":"text","text":"Completa dal CMS le informazioni su cookie tecnici, eventuali servizi terzi, durata, consenso e modalita di gestione delle preferenze."}]}]}'::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    '7c045ffc-5571-402b-b575-86a0a6d9f103',
    'Privacy policy',
    'privacy-policy',
    'PUBLISHED',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Questa privacy policy descrive come Middleware tratta i dati personali degli utenti."}]},{"type":"paragraph","content":[{"type":"text","text":"Completa dal CMS titolare del trattamento, finalità, basi giuridiche, tempi di conservazione, diritti degli interessati e contatti privacy."}]}]}'::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("slug") DO UPDATE
SET
  "title" = EXCLUDED."title",
  "status" = EXCLUDED."status",
  "contentRich" = CASE
    WHEN "pages"."contentRich" IS NULL THEN EXCLUDED."contentRich"
    ELSE "pages"."contentRich"
  END,
  "publishedAt" = COALESCE("pages"."publishedAt", EXCLUDED."publishedAt"),
  "updatedAt" = CURRENT_TIMESTAMP;
