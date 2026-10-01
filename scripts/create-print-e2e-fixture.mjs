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

const content = (title, paragraphs) => ({
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: title }] },
    ...paragraphs.map((text) => ({ type: "paragraph", content: [{ type: "text", text }] })),
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
  },
  {
    id: randomUUID(),
    type: "body",
    articleIds: [articleIds[1]],
    featuredPlacement: "left",
  },
  {
    id: randomUUID(),
    type: "closing",
    articleIds: [articleIds[2]],
    featuredPlacement: "right",
  },
];

const client = new Client({ connectionString });
await client.connect();

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

  const titles = ["Apertura del numero", "Il corpo della prova", "Chiusura editoriale"];
  for (let index = 0; index < articleIds.length; index += 1) {
    await client.query(
      'INSERT INTO "articles" (id, "issueId", "categoryId", "authorId", status, "publishedAt", title, slug, excerpt, "contentRich", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, \'DRAFT\', NULL, $5, $6, $7, $8, NOW(), NOW())',
      [
        articleIds[index],
        issueId,
        categoryId,
        authorId,
        titles[index],
        `${slug}-${index + 1}`,
        `Sommario dell’articolo di prova ${index + 1}.`,
        JSON.stringify(
          content(titles[index], [
            "Questo paragrafo verifica la resa del testo editoriale nel formato A4 e la continuità della composizione.",
            "Il contenuto viene caricato dal rich text completo, mantenendo titoli, paragrafi e citazioni senza ridurlo a un semplice excerpt.",
          ]),
        ),
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
