CREATE TABLE "navigation_menus" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "navigation_menus_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "navigation_menus_key_key" ON "navigation_menus"("key");

INSERT INTO "navigation_menus" ("id", "key", "label", "items", "createdAt", "updatedAt")
VALUES
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'main',
    'Menu principale',
    '{"version":1,"items":[{"id":"main-home","type":"home","label":"Numero corrente"},{"id":"main-archive","type":"archive","label":"Archivio"},{"id":"main-about","type":"custom","label":"Chi siamo","href":"/chi-siamo"}]}'::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    'footer_sections',
    'Footer sezioni',
    '{"version":1,"items":[{"id":"footer-sections-home","type":"home","label":"Numero corrente"},{"id":"footer-sections-archive","type":"archive","label":"Archivio"},{"id":"footer-sections-about","type":"custom","label":"Chi siamo","href":"/chi-siamo"}]}'::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    'footer_legal',
    'Footer legale',
    '{"version":1,"items":[{"id":"footer-legal-privacy","type":"custom","label":"Privacy policy","href":"/privacy-policy"},{"id":"footer-legal-cookie","type":"custom","label":"Cookie policy","href":"/cookie-policy"}]}'::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("key") DO NOTHING;
