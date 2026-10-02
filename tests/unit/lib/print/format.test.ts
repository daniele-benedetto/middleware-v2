import { describe, expect, it } from "vitest";

import { printFormats, resolvePrintFormat } from "@/lib/print/format";
import { buildPrintIssueDocument } from "@/lib/print/issue-document";
import { inspectPrintIssueDocument } from "@/lib/print/preflight";

import type { PrintArticleSource, PrintIssueSource } from "@/lib/print/issue-document";

const articleId = "00000000-0000-4000-8000-000000000001";

const content = (text: string) => ({
  type: "doc",
  content: [
    { type: "paragraph", content: [{ type: "text", text }] },
    { type: "image", attrs: { src: "/api/cms/media/blob?pathname=figura.jpg", alt: "" } },
  ],
});

const article: PrintArticleSource = {
  id: articleId,
  slug: "articolo",
  title: "Articolo",
  titleStyled: null,
  excerpt: null,
  authorName: null,
  categoryName: null,
  contentRich: content("Testo"),
  imageUrl: null,
  imageAlt: null,
};

const issue = (sectionCount = 1): PrintIssueSource => ({
  slug: "numero-zero",
  title: "Numero",
  titleStyled: null,
  description: null,
  publishedAt: null,
  homeVariant: "default",
  printSettings: {
    showIssueNumber: true,
    coverImageUrl: null,
    coverImageAlt: "",
    coverImageMode: "contained",
  },
  homeBlocks: Array.from({ length: sectionCount }, (_, index) => ({
    id: `b${index}`,
    type: "body" as const,
    articleIds: [articleId],
    featuredPlacement: "left" as const,
    printSettings: {
      [articleId]: {
        showInIssueIntro: false,
        stopWithSiteCta: true,
        excludeFromPrint: false,
        showEndLogo: false,
        layout: "default" as const,
      },
    },
  })),
});

const build = (format: "a4" | "a5", sectionCount = 1) =>
  buildPrintIssueDocument({
    issue: issue(sectionCount),
    articles: [article],
    maps: [],
    courses: [],
    issueNumber: "N. 00",
    format,
  });

describe("resolvePrintFormat", () => {
  it("defaults to A4 and rejects unknown formats", () => {
    expect(resolvePrintFormat(undefined)).toBe("a4");
    expect(resolvePrintFormat("a5")).toBe("a5");
    expect(resolvePrintFormat("a3")).toBe("a4");
  });
});

describe("print formats", () => {
  it("imposes each format two-up on a sheet twice its size", () => {
    for (const spec of Object.values(printFormats)) {
      expect(spec.sheet.heightMm).toBe(spec.page.heightMm);
      expect(spec.sheet.widthMm).toBeGreaterThanOrEqual(2 * spec.page.widthMm);
    }
  });

  it("leaves the images inside the text out of A5 only", () => {
    const images = (format: "a4" | "a5") => {
      const [section] = build(format).sections;
      const content = section?.kind === "article" ? section.content : null;
      return JSON.stringify(content).includes('"type":"image"');
    };

    expect(build("a5").format).toBe("a5");
    expect(images("a4")).toBe(true);
    expect(images("a5")).toBe(false);
  });

  it("checks the index capacity of the format", () => {
    const codes = (format: "a4" | "a5") =>
      inspectPrintIssueDocument(build(format, 24)).map((entry) => entry.code);

    expect(codes("a4")).not.toContain("crowded-toc");
    expect(codes("a5")).toContain("crowded-toc");
  });
});
