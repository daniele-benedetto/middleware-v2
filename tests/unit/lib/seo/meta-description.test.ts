import { describe, expect, it } from "vitest";

import { META_DESCRIPTION_MAX_LENGTH, toMetaDescription } from "@/lib/seo/meta-description";

describe("toMetaDescription", () => {
  it("returns undefined for empty input", () => {
    expect(toMetaDescription(undefined)).toBeUndefined();
    expect(toMetaDescription(null)).toBeUndefined();
    expect(toMetaDescription("   \n  ")).toBeUndefined();
  });

  it("collapses whitespace and keeps short text intact", () => {
    expect(toMetaDescription("  Un'inchiesta\n\nsul   territorio. ")).toBe(
      "Un'inchiesta sul territorio.",
    );
  });

  it("cuts long text on a word boundary within the limit", () => {
    const text = `${"inchiesta territoriale ".repeat(20)}fine`;
    const description = toMetaDescription(text);

    expect(description).toBeDefined();
    expect(description!.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX_LENGTH);
    expect(description!.endsWith("…")).toBe(true);
    expect(description).not.toMatch(/\s…$/);
    expect(text.startsWith(description!.slice(0, -1))).toBe(true);
  });

  it("drops trailing punctuation before the ellipsis", () => {
    const text = `${"a".repeat(150)}, ${"b".repeat(40)}`;

    expect(toMetaDescription(text)).toBe(`${"a".repeat(150)}…`);
  });

  it("hard-cuts a single word longer than the limit", () => {
    const description = toMetaDescription("x".repeat(400), 20);

    expect(description).toBe(`${"x".repeat(19)}…`);
  });
});
