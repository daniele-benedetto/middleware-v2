import { describe, expect, it } from "vitest";

import { acceptsClosingExpansion, nextClosingSection } from "@/lib/print/closing-pages";

describe("spare booklet pages", () => {
  const sections = [
    { anchor: "first", maxPages: 2, lengths: [5000] },
    { anchor: "last", maxPages: 2, lengths: [4500] },
  ];

  it("offers the latest article with meaningful omitted copy first", () => {
    const budgets = new Map([
      ["first", 3500],
      ["last", 3500],
    ]);
    expect(nextClosingSection(sections, budgets, new Set())?.anchor).toBe("last");
    expect(nextClosingSection(sections, budgets, new Set(["last"]))?.anchor).toBe("first");
    expect(nextClosingSection(sections, budgets, new Set(["first", "last"]))).toBeUndefined();
  });

  it("preserves a pause rather than expanding an article with too little omitted text", () => {
    expect(nextClosingSection(sections, new Map([["last", 4000]]), new Set())).toBeUndefined();
  });

  it("accepts a new page only if it replaces one blank and carries enough text", () => {
    const trial = { beforePages: 2, beforeFillers: 2 };
    expect(
      acceptsClosingExpansion({ ...trial, afterPages: 3, afterFillers: 1, tailLines: 24 }),
    ).toBe(true);
    expect(
      acceptsClosingExpansion({ ...trial, afterPages: 3, afterFillers: 1, tailLines: 8 }),
    ).toBe(false);
    expect(
      acceptsClosingExpansion({ ...trial, afterPages: 2, afterFillers: 2, tailLines: 30 }),
    ).toBe(false);
    expect(
      acceptsClosingExpansion({ ...trial, afterPages: 4, afterFillers: 0, tailLines: 30 }),
    ).toBe(false);
    expect(
      acceptsClosingExpansion({ ...trial, afterPages: 3, afterFillers: 2, tailLines: 30 }),
    ).toBe(false);
  });
});
