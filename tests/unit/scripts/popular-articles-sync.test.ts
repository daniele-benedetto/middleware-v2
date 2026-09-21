import { describe, expect, it, vi } from "vitest";

import {
  DAY_MS,
  PAGE_SIZE,
  WINDOW_DAYS,
  articleSlugFromPath,
  fetchMetrics,
  getWindow,
  parseMetricRows,
} from "../../../scripts/lib/popular-articles-sync.mjs";

describe("popular articles Umami sync", () => {
  it("uses an explicit rolling 90-day window", () => {
    const now = new Date("2026-09-21T12:00:00.000Z");

    expect(getWindow(now)).toEqual({
      startAt: now.getTime() - WINDOW_DAYS * DAY_MS,
      endAt: now.getTime(),
    });
  });

  it("accepts only canonical article pathnames", () => {
    expect(articleSlugFromPath("/articoli/analisi-2026")).toBe("analisi-2026");
    expect(articleSlugFromPath("/articoli/analisi-2026/")).toBe("analisi-2026");
    expect(articleSlugFromPath("/articoli/analisi%20speciale")).toBe("analisi speciale");
    expect(articleSlugFromPath("/articoli/%E0%A4%A")).toBeNull();
    expect(articleSlugFromPath("/articoli/a%2Fb")).toBeNull();
    expect(articleSlugFromPath("/cms/articoli/analisi")).toBeNull();
    expect(articleSlugFromPath("/articoli/analisi?preview=true")).toBeNull();
  });

  it("rejects malformed Umami payloads while ignoring unrelated valid paths", () => {
    expect(
      parseMetricRows([
        { name: "/articoli/analisi", pageviews: "4" },
        { name: "/chi-siamo", pageviews: 9 },
      ]),
    ).toEqual([{ slug: "analisi", pageviews: 4 }]);
    expect(() => parseMetricRows({})).toThrow("must be an array");
    expect(() => parseMetricRows([{ name: "/articoli/analisi", pageviews: "4.5" }])).toThrow(
      "invalid name or pageviews",
    );
  });

  it("requests every page using explicit timestamps and offsets", async () => {
    const firstPage = Array.from({ length: PAGE_SIZE }, (_, index) => ({
      name: `/articoli/first-${index}`,
      pageviews: "1",
    }));
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(firstPage)))
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ name: "/articoli/final", pageviews: "3" }])),
      );

    const metrics = await fetchMetrics({
      authorization: "Bearer temporary-token",
      baseUrl: "https://stats.example.test",
      fetchImpl,
      websiteId: "website-id",
      window: { startAt: 10, endAt: 20 },
    });

    expect(metrics).toHaveLength(PAGE_SIZE + 1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const firstRequest = fetchImpl.mock.calls[0][0];
    expect(firstRequest.searchParams.get("type")).toBe("path");
    expect(firstRequest.searchParams.get("eventType")).toBe("1");
    expect(firstRequest.searchParams.get("startAt")).toBe("10");
    expect(firstRequest.searchParams.get("endAt")).toBe("20");
    expect(firstRequest.searchParams.get("limit")).toBe(String(PAGE_SIZE));
    expect(firstRequest.searchParams.get("offset")).toBe("0");
    expect(fetchImpl.mock.calls[1][0].searchParams.get("offset")).toBe(String(PAGE_SIZE));
  });

  it("fails before any database change when Umami rejects the metrics request", async () => {
    await expect(
      fetchMetrics({
        authorization: "Bearer temporary-token",
        baseUrl: "https://stats.example.test",
        fetchImpl: vi.fn().mockResolvedValue(new Response(null, { status: 502 })),
        websiteId: "website-id",
        window: { startAt: 10, endAt: 20 },
      }),
    ).rejects.toThrow("status 502");
  });
});
