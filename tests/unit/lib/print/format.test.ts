import { describe, expect, it } from "vitest";

import { printFormat } from "@/lib/print/format";
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

const issue = (sectionCount = 1, showBodyImages = true): PrintIssueSource => ({
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
        showBodyImages,
      },
    },
  })),
});

const build = (sectionCount = 1, showBodyImages = true) =>
  buildPrintIssueDocument({
    issue: issue(sectionCount, showBodyImages),
    articles: [article],
    maps: [],
    courses: [],
    issueNumber: "N. 00",
  });

const hasImages = (showBodyImages: boolean) => {
  const [section] = build(1, showBodyImages).sections;
  const content = section?.kind === "article" ? section.content : null;
  return JSON.stringify(content).includes('"type":"image"');
};

describe("print format", () => {
  it("imposes the A5 pages two-up on an A4 sheet", () => {
    expect(printFormat.sheet.heightMm).toBe(printFormat.page.heightMm);
    expect(printFormat.sheet.widthMm).toBeGreaterThanOrEqual(2 * printFormat.page.widthMm);
  });

  it("prints the images inside the article text unless the article turns them off", () => {
    expect(hasImages(true)).toBe(true);
    expect(hasImages(false)).toBe(false);
  });

  it("checks the index capacity of one page", () => {
    const codes = (sectionCount: number) =>
      inspectPrintIssueDocument(build(sectionCount)).map((entry) => entry.code);

    expect(codes(printFormat.tocCapacity)).not.toContain("crowded-toc");
    expect(codes(printFormat.tocCapacity + 1)).toContain("crowded-toc");
  });
});
