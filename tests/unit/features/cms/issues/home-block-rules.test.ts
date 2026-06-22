import { describe, expect, it } from "vitest";

import {
  isEditorialSingleBlock,
  isSingleArticleBlock,
  normalizeHomeBlock,
} from "@/lib/issues/home-block-rules";

describe("home block rules", () => {
  it("identifies constrained single-article blocks", () => {
    expect(isSingleArticleBlock("opening")).toBe(true);
    expect(isSingleArticleBlock("rupture")).toBe(true);
    expect(isSingleArticleBlock("closing")).toBe(true);
    expect(isSingleArticleBlock("body")).toBe(false);
  });

  it("keeps closing copy while stripping opening and rupture copy", () => {
    expect(isEditorialSingleBlock("opening")).toBe(true);
    expect(isEditorialSingleBlock("rupture")).toBe(true);
    expect(isEditorialSingleBlock("closing")).toBe(false);

    expect(
      normalizeHomeBlock({
        id: "closing",
        type: "closing",
        variant: "default",
        title: "Chiusura",
        description: "Copy",
        articleIds: ["00000000-0000-4000-8000-000000000001"],
        featuredArticleId: null,
        featuredPlacement: "right",
      }),
    ).toMatchObject({ title: "Chiusura", description: "Copy", featuredPlacement: "left" });
  });

  it("trims opening blocks to one article and removes copy", () => {
    expect(
      normalizeHomeBlock({
        id: "opening",
        type: "opening",
        variant: "red",
        title: "Apertura",
        titleStyled: [{ text: "Apertura", tone: "primary" }],
        description: "Copy",
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
      variant: "red",
      title: null,
      titleStyled: null,
      description: null,
      articleIds: ["00000000-0000-4000-8000-000000000001"],
      featuredArticleId: "00000000-0000-4000-8000-000000000001",
      featuredPlacement: "left",
    });
  });

  it("keeps rupture image placement while stripping copy", () => {
    expect(
      normalizeHomeBlock({
        id: "rupture",
        type: "rupture",
        variant: "red",
        title: "Rottura",
        titleStyled: [{ text: "Rottura", tone: "primary" }],
        description: "Copy",
        articleIds: ["00000000-0000-4000-8000-000000000001"],
        featuredArticleId: "00000000-0000-4000-8000-000000000001",
        featuredPlacement: "right",
      }),
    ).toMatchObject({
      title: null,
      titleStyled: null,
      description: null,
      featuredPlacement: "right",
    });
  });
});
