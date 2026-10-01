import { randomUUID } from "node:crypto";

import pg from "pg";

const { Client } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const suffix = Date.now().toString(36);
const issueId = randomUUID();
const articleIds = [randomUUID(), randomUUID(), randomUUID()];
const categoryId = randomUUID();
const authorId = randomUUID();
const slug = `e2e-print-${suffix}`;

const paragraph = (text) => ({ type: "paragraph", content: [{ type: "text", text }] });

const filler = [
  "Questo paragrafo verifica la resa del testo editoriale nel formato A4 e la continuità della composizione tra la pagina di apertura e le pagine successive, con colonne giustificate e sillabazione italiana.",
  "Il contenuto viene caricato dal rich text completo, mantenendo titoli, paragrafi e citazioni senza ridurlo a un semplice sommario: la paginazione deve riempire le colonne fino al piede e riprendere dal punto esatto.",
  "Le trasformazioni del quartiere attraversano la sicurezza, la riqualificazione, la memoria e la vita quotidiana, e diventano terreno di contesa tra soggetti diversi che abitano gli stessi spazi.",
];

const content = (title, paragraphCount) => ({
  type: "doc",
  content: [
    ...Array.from({ length: paragraphCount }, (_, index) =>
      paragraph(filler[index % filler.length]),
    ),
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: title }] },
    ...filler.map(paragraph),
    {
      type: "blockquote",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Una citazione di prova per il layout editoriale." }],
        },
      ],
    },
  ],
});

const homeBlocks = [
  {
    id: randomUUID(),
    type: "opening",
    articleIds: [articleIds[0]],
    featuredPlacement: "left",
    printSettings: {
      [articleIds[0]]: { showInIssueIntro: true, stopWithSiteCta: false, excludeFromPrint: false },
    },
  },
  {
    id: randomUUID(),
    type: "rupture",
    articleIds: [articleIds[1]],
    featuredPlacement: "left",
    printSettings: {
      [articleIds[1]]: { showInIssueIntro: true, stopWithSiteCta: true, excludeFromPrint: false },
    },
  },
  {
    id: randomUUID(),
    type: "closing",
    articleIds: [articleIds[2]],
    featuredPlacement: "right",
    printSettings: {
      [articleIds[2]]: { showInIssueIntro: true, stopWithSiteCta: false, excludeFromPrint: false },
    },
  },
];

const client = new Client({ connectionString });
await client.connect();

const {
  rows: [sampleMap],
} = await client.query('SELECT id FROM "maps" ORDER BY "createdAt" LIMIT 1');
if (sampleMap) {
  homeBlocks.splice(2, 0, {
    id: randomUUID(),
    type: "map",
    mapId: sampleMap.id,
    printSettings: { showInIssueIntro: false, stopWithSiteCta: false, excludeFromPrint: false },
  });
}

try {
  await client.query("BEGIN");
  await client.query(
    'INSERT INTO "authors" (id, name, slug, "isActive", "createdAt", "updatedAt") VALUES ($1, $2, $3, true, NOW(), NOW())',
    [authorId, "Redazione E2E", `redazione-e2e-${suffix}`],
  );
  await client.query(
    'INSERT INTO "categories" (id, name, slug, "isActive", "createdAt", "updatedAt") VALUES ($1, $2, $3, true, NOW(), NOW())',
    [categoryId, "E2E Print", `e2e-print-${suffix}`],
  );
  await client.query(
    'INSERT INTO "issues" (id, title, slug, description, "homeBlocks", "printSettings", "homeVariant", "isActive", "sortOrder", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, true, 0, NOW(), NOW())',
    [
      issueId,
      "Issue E2E — Test stampa A4",
      slug,
      JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Issue di test per l’export PDF." }],
          },
        ],
      }),
      JSON.stringify(homeBlocks),
      JSON.stringify({
        showIssueNumber: true,
        coverImageUrl: null,
        coverImageAlt: "",
        coverImageMode: "contained",
      }),
      "black",
    ],
  );

  const {
    rows: [sampleImage],
  } = await client.query(
    'SELECT "imageUrl" FROM "articles" WHERE "imageUrl" IS NOT NULL ORDER BY "createdAt" LIMIT 1',
  );
  const fixtures = [
    { title: "Apertura del numero", paragraphs: 24, imageUrl: sampleImage?.imageUrl ?? null },
    { title: "Rottura con rimando al sito", paragraphs: 30, imageUrl: null },
    { title: "Chiusura editoriale", paragraphs: 10, imageUrl: sampleImage?.imageUrl ?? null },
  ];
  for (const [index, fixture] of fixtures.entries()) {
    await client.query(
      'INSERT INTO "articles" (id, "issueId", "categoryId", "authorId", status, "publishedAt", title, slug, excerpt, "contentRich", "imageUrl", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, \'DRAFT\', NULL, $5, $6, $7, $8, $9, NOW(), NOW())',
      [
        articleIds[index],
        issueId,
        categoryId,
        authorId,
        fixture.title,
        `${slug}-${index + 1}`,
        `Sommario dell’articolo di prova ${index + 1}, usato anche nei richiami di copertina.`,
        JSON.stringify(content(fixture.title, fixture.paragraphs)),
        fixture.imageUrl,
      ],
    );
  }

  await client.query("COMMIT");
  process.stdout.write(JSON.stringify({ issueId, slug }));
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
