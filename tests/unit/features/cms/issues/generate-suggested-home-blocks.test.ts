import { describe, expect, it } from "vitest";

import {
  generateSuggestedHomeBlocks,
  type SuggestedHomeBlockArticle,
} from "@/features/cms/issues/lib/generate-suggested-home-blocks";

const article = (
  overrides: Partial<SuggestedHomeBlockArticle> &
    Pick<SuggestedHomeBlockArticle, "id" | "categorySlug">,
): SuggestedHomeBlockArticle => ({
  title: overrides.id,
  isFeatured: false,
  position: 1,
  categoryName: overrides.categorySlug,
  ...overrides,
});

describe("generateSuggestedHomeBlocks", () => {
  it("builds an issue-level editorial layout without duplicate articles", () => {
    const blocks = generateSuggestedHomeBlocks([
      article({ id: "editoriale", categorySlug: "editoriale", position: 1 }),
      article({ id: "contributo-1", categorySlug: "contributi", position: 2, isFeatured: true }),
      article({ id: "intervista-1", categorySlug: "interviste", position: 3 }),
      article({ id: "intervista-2", categorySlug: "interviste", position: 4 }),
      article({ id: "intervista-3", categorySlug: "interviste", position: 5 }),
      article({ id: "contributo-2", categorySlug: "contributi", position: 6 }),
      article({ id: "contributo-3", categorySlug: "contributi", position: 7 }),
      article({ id: "intervista-4", categorySlug: "interviste", position: 8 }),
    ]);

    expect(blocks).toMatchObject([
      {
        type: "opening",
        articleIds: ["editoriale"],
        title: null,
        description: null,
      },
      {
        type: "constellation",
        articleIds: ["contributo-1", "intervista-1", "intervista-2"],
        featuredArticleId: "contributo-1",
      },
      {
        type: "sequence",
        articleIds: ["contributo-2", "intervista-3", "intervista-4"],
        featuredArticleId: "contributo-2",
      },
      {
        type: "closing",
        articleIds: ["contributo-3"],
        featuredArticleId: "contributo-3",
      },
    ]);

    const articleIds = blocks.flatMap((block) => block.articleIds);
    expect(new Set(articleIds).size).toBe(articleIds.length);
  });

  it("falls back to the first article when no editorial exists", () => {
    const blocks = generateSuggestedHomeBlocks([
      article({ id: "contributo-1", categorySlug: "contributi", position: 1 }),
      article({ id: "intervista-1", categorySlug: "interviste", position: 2 }),
    ]);

    expect(blocks[0]).toMatchObject({
      type: "opening",
      articleIds: ["contributo-1"],
    });
    expect(blocks.flatMap((block) => block.articleIds)).toEqual(["contributo-1", "intervista-1"]);
  });

  it("degrades without empty middle blocks when articles are scarce", () => {
    const blocks = generateSuggestedHomeBlocks([
      article({ id: "editoriale", categorySlug: "editoriale", position: 1 }),
    ]);

    expect(blocks).toEqual([
      {
        id: "apertura-editoriale",
        type: "opening",
        source: "manual",
        title: null,
        description: null,
        articleIds: ["editoriale"],
        featuredArticleId: "editoriale",
      },
    ]);
  });
});
