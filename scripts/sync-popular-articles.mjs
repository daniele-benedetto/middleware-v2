import pg from "pg";

import { fetchMetrics, getWindow } from "./lib/popular-articles-sync.mjs";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;
const umamiApiKey = process.env.UMAMI_API_KEY;
const umamiUsername = process.env.UMAMI_USERNAME;
const umamiPassword = process.env.UMAMI_PASSWORD;
const umamiWebsiteId = process.env.UMAMI_WEBSITE_ID;
const umamiBaseUrl = process.env.UMAMI_BASE_URL ?? "https://stats.middleware.media";

if (!databaseUrl || !umamiWebsiteId || (!umamiApiKey && (!umamiUsername || !umamiPassword))) {
  throw new Error(
    "DATABASE_URL, UMAMI_WEBSITE_ID, and either UMAMI_API_KEY or UMAMI_USERNAME/UMAMI_PASSWORD are required",
  );
}

async function getAuthorizationHeader() {
  if (umamiApiKey) return `Bearer ${umamiApiKey}`;

  const response = await fetch(new URL("/api/auth/login", umamiBaseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: umamiUsername, password: umamiPassword }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Umami login failed with status ${response.status}`);

  const body = await response.json();
  if (!body || typeof body !== "object" || typeof body.token !== "string") {
    throw new Error("Umami login response did not include a token");
  }

  return `Bearer ${body.token}`;
}

async function sync() {
  const window = getWindow();
  const authorization = await getAuthorizationHeader();
  const metrics = await fetchMetrics({
    authorization,
    baseUrl: umamiBaseUrl,
    websiteId: umamiWebsiteId,
    window,
  });
  const pageviewsBySlug = new Map();
  for (const metric of metrics) {
    pageviewsBySlug.set(metric.slug, (pageviewsBySlug.get(metric.slug) ?? 0) + metric.pageviews);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const articles = await pool.query(
      `SELECT article."id", article."slug"
       FROM "articles" AS article
       INNER JOIN "global_search_documents" AS document
          ON document."sourceId" = article."id" AND document."sourceType" = 'article'
       WHERE article."status" = 'PUBLISHED'
         AND article."publishedAt" IS NOT NULL
         AND article."slug" = ANY($1::text[])`,
      [[...pageviewsBySlug.keys()]],
    );
    const syncedAt = new Date();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query('DELETE FROM "article_popularities"');
      for (const article of articles.rows) {
        await client.query(
          `INSERT INTO "article_popularities" ("articleId", "pageviews", "windowStart", "windowEnd", "syncedAt")
           VALUES ($1, $2, $3, $4, $5)`,
          [
            article.id,
            pageviewsBySlug.get(article.slug),
            new Date(window.startAt),
            new Date(window.endAt),
            syncedAt,
          ],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    console.log(
      `popular_articles_sync=ok metrics=${metrics.length} articles=${articles.rowCount ?? 0}`,
    );
  } finally {
    await pool.end();
  }
}

await sync();
