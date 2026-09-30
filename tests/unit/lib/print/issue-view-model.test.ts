import { describe, expect, it } from "vitest";

import { buildIssuePrintSequence } from "@/lib/print/issue-view-model";

const article = (id: string) => ({
  id,
  slug: id,
  title: `Articolo ${id}`,
  excerpt: null,
  authorName: null,
  categoryName: null,
  contentRich: { type: "doc", content: [] },
});

describe("buildIssuePrintSequence", () => {
  it("uses block order and appends unassigned articles", () => {
    const result = buildIssuePrintSequence(
      [
        {
          id: "opening",
          type: "opening",
          articleIds: ["a2"],
          featuredPlacement: "left",
        },
        { id: "map", type: "map", mapId: "map-1" },
        {
          id: "body",
          type: "body",
          articleIds: ["a1"],
          featuredPlacement: "left",
        },
      ],
      [article("a1"), article("a2"), article("a3")],
    );

    expect(result.articles.map(({ article: item, type }) => [item.id, type])).toEqual([
      ["a2", "opening"],
      ["a1", "body"],
      ["a3", "body"],
    ]);
    expect(result.specialItems).toEqual([
      {
        id: "map",
        type: "map",
        printSettings: {
          showInIssueIntro: false,
          stopWithSiteCta: false,
          excludeFromPrint: false,
        },
      },
    ]);
  });

  it("skips stale article references without breaking the sequence", () => {
    const result = buildIssuePrintSequence(
      [{ id: "body", type: "body", articleIds: ["missing"], featuredPlacement: "left" }],
      [article("a1")],
    );

    expect(result.articles.map(({ article: item }) => item.id)).toEqual(["a1"]);
  });

  it("separates cover teasers, excluded articles and site-cta articles", () => {
    const result = buildIssuePrintSequence(
      [
        {
          id: "body",
          type: "body",
          articleIds: ["a1", "a2", "a3"],
          featuredPlacement: "left",
          printSettings: {
            a1: { showInIssueIntro: true, stopWithSiteCta: false, excludeFromPrint: false },
            a2: { showInIssueIntro: true, stopWithSiteCta: false, excludeFromPrint: true },
            a3: { showInIssueIntro: false, stopWithSiteCta: true, excludeFromPrint: false },
          },
        },
      ],
      [article("a1"), article("a2"), article("a3")],
    );

    expect(result.introArticles.map(({ article: item }) => item.id)).toEqual(["a1"]);
    expect(result.articles.map(({ article: item }) => item.id)).toEqual(["a1", "a3"]);
    expect(result.partialArticles.map(({ article: item }) => item.id)).toEqual(["a3"]);
  });
});
