import { describe, expect, it } from "vitest";

import { isSingleArticleBlock, normalizeHomeBlock } from "@/lib/issues/home-block-rules";

describe("home block rules", () => {
  it("identifies constrained single-article blocks", () => {
    expect(isSingleArticleBlock("opening")).toBe(true);
    expect(isSingleArticleBlock("rupture")).toBe(true);
    expect(isSingleArticleBlock("closing")).toBe(true);
    expect(isSingleArticleBlock("body")).toBe(false);
  });

  it("keeps closing image placement", () => {
    expect(
      normalizeHomeBlock({
        id: "closing",
        type: "closing",
        articleIds: ["00000000-0000-4000-8000-000000000001"],
        featuredArticleId: null,
        featuredPlacement: "right",
      }),
    ).toMatchObject({ featuredPlacement: "right" });
  });

  it("trims opening blocks to one article", () => {
    expect(
      normalizeHomeBlock({
        id: "opening",
        type: "opening",
        articleIds: [
          "00000000-0000-4000-8000-000000000001",
          "00000000-0000-4000-8000-000000000002",
        ],
        featuredArticleId: "00000000-0000-4000-8000-000000000002",
        featuredPlacement: "right",
      }),
    ).toEqual({
      id: "opening",
      type: "opening",
      articleIds: ["00000000-0000-4000-8000-000000000001"],
      featuredArticleId: "00000000-0000-4000-8000-000000000001",
      featuredPlacement: "left",
    });
  });

  it("keeps rupture image placement", () => {
    expect(
      normalizeHomeBlock({
        id: "rupture",
        type: "rupture",
        articleIds: ["00000000-0000-4000-8000-000000000001"],
        featuredArticleId: "00000000-0000-4000-8000-000000000001",
        featuredPlacement: "right",
      }),
    ).toMatchObject({
      featuredPlacement: "right",
    });
  });
});
