import pg from "pg";

const { Pool } = pg;
const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 90;
const PAGE_SIZE = 500;

const databaseUrl = process.env.DATABASE_URL;
const umamiApiKey = process.env.UMAMI_API_KEY;
const umamiWebsiteId = process.env.UMAMI_WEBSITE_ID;
const umamiBaseUrl = process.env.UMAMI_BASE_URL ?? "https://stats.middleware.media";

if (!databaseUrl || !umamiApiKey || !umamiWebsiteId) {
  throw new Error("DATABASE_URL, UMAMI_API_KEY, and UMAMI_WEBSITE_ID are required");
}

function getWindow(now = new Date()) {
  const endAt = now.getTime();
  return {
    startAt: endAt - WINDOW_DAYS * DAY_MS,
    endAt,
  };
}

function articleSlugFromPath(pathname) {
  const match = /^\/articoli\/([^/?#]+)\/?$/.exec(pathname);
  return match ? decodeURIComponent(match[1]) : null;
}

function parseMetricRows(value) {
  if (!Array.isArray(value)) throw new Error("Umami metrics response must be an array");

  return value.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const { name, pageviews } = row;
    if (typeof name !== "string" || !Number.isInteger(pageviews) || pageviews < 0) return [];

    const slug = articleSlugFromPath(name);
    return slug ? [{ slug, pageviews }] : [];
  });
}

async function fetchMetrics(window) {
  const records = [];
  let offset = 0;

  while (true) {
    const url = new URL(`/api/websites/${umamiWebsiteId}/metrics/expanded`, umamiBaseUrl);
    url.search = new URLSearchParams({
      type: "path",
      eventType: "1",
      startAt: String(window.startAt),
      endAt: String(window.endAt),
      limit: String(PAGE_SIZE),
      offset: String(offset),
    }).toString();

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${umamiApiKey}` },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok)
      throw new Error(`Umami metrics request failed with status ${response.status}`);

    const responseBody = await response.json();
    const pageLength = Array.isArray(responseBody) ? responseBody.length : 0;
    const rows = parseMetricRows(responseBody);
    records.push(...rows);
    if (pageLength < PAGE_SIZE) return records;
    offset += PAGE_SIZE;
  }
}

async function sync() {
  const window = getWindow();
  const metrics = await fetchMetrics(window);
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
       WHERE article."slug" = ANY($1::text[])`,
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
