import { beforeEach, describe, expect, it, vi } from "vitest";

const pageFindMany = vi.fn();
const articleFindMany = vi.fn();
const issueFindFirst = vi.fn();
const issueFindMany = vi.fn();

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, connection: vi.fn().mockResolvedValue(undefined) };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    article: { findMany: articleFindMany },
    issue: { findFirst: issueFindFirst, findMany: issueFindMany },
    page: { findMany: pageFindMany },
  },
}));

describe("metadata routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    issueFindFirst.mockResolvedValue(null);
    articleFindMany.mockResolvedValue([]);
    issueFindMany.mockResolvedValue([]);
    pageFindMany.mockResolvedValue([]);
  });

  it("blocks CMS paths in robots including the exact /cms path", async () => {
    const { default: robots } = await import("@/app/robots");
    const rules = robots().rules;

    expect(Array.isArray(rules) ? rules[0]?.disallow : rules?.disallow).toContain("/cms");
    expect(Array.isArray(rules) ? rules[0]?.disallow : rules?.disallow).toContain("/cms/");
  });

  it("includes only published allowlisted static pages in sitemap", async () => {
    const updatedAt = new Date("2026-01-03T00:00:00.000Z");
    const publishedAt = new Date("2026-01-01T00:00:00.000Z");
    pageFindMany.mockResolvedValue([
      { slug: "chi-siamo", publishedAt, updatedAt },
      { slug: "non-allowlisted", publishedAt, updatedAt },
    ]);

    const { default: sitemap } = await import("@/app/sitemap");
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(pageFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "PUBLISHED",
          publishedAt: { not: null },
          slug: { in: ["chi-siamo", "cookie-policy", "privacy-policy"] },
        }),
      }),
    );
    expect(urls).toContain("http://localhost:3000/chi-siamo");
    expect(urls).not.toContain("http://localhost:3000/non-allowlisted");
  });
});
