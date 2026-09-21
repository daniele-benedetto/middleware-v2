export const DAY_MS = 24 * 60 * 60 * 1_000;
export const WINDOW_DAYS = 90;
export const PAGE_SIZE = 500;

export function getWindow(now = new Date()) {
  const endAt = now.getTime();
  return {
    startAt: endAt - WINDOW_DAYS * DAY_MS,
    endAt,
  };
}

export function articleSlugFromPath(pathname) {
  const match = /^\/articoli\/([^/?#]+)\/?$/.exec(pathname);
  if (!match) return null;

  try {
    const slug = decodeURIComponent(match[1]);
    return slug && !slug.includes("/") ? slug : null;
  } catch {
    return null;
  }
}

function pageviewsFromMetric(value) {
  if (Number.isSafeInteger(value) && value >= 0) return value;
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;

  const pageviews = Number(value);
  return Number.isSafeInteger(pageviews) ? pageviews : null;
}

export function parseMetricRows(value) {
  if (!Array.isArray(value)) throw new Error("Umami metrics response must be an array");

  return value.flatMap((row) => {
    if (!row || typeof row !== "object") throw new Error("Umami metrics row must be an object");

    const { name } = row;
    const pageviews = pageviewsFromMetric(row.pageviews);
    if (typeof name !== "string" || pageviews === null) {
      throw new Error("Umami metrics row has invalid name or pageviews");
    }

    const slug = articleSlugFromPath(name);
    return slug ? [{ slug, pageviews }] : [];
  });
}

export async function fetchMetrics({
  authorization,
  baseUrl,
  fetchImpl = fetch,
  websiteId,
  window,
}) {
  const records = [];
  let offset = 0;

  while (true) {
    const url = new URL(`/api/websites/${websiteId}/metrics/expanded`, baseUrl);
    url.search = new URLSearchParams({
      type: "path",
      eventType: "1",
      startAt: String(window.startAt),
      endAt: String(window.endAt),
      limit: String(PAGE_SIZE),
      offset: String(offset),
    }).toString();

    const response = await fetchImpl(url, {
      headers: { Authorization: authorization },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      throw new Error(`Umami metrics request failed with status ${response.status}`);
    }

    const responseBody = await response.json();
    const rows = parseMetricRows(responseBody);
    records.push(...rows);
    if (responseBody.length < PAGE_SIZE) return records;
    offset += PAGE_SIZE;
  }
}
