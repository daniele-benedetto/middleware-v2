import { describe, expect, it } from "vitest";

import { nextTighten, PRINT_TIGHTEN_MAX_LEVEL, startTighten } from "@/lib/print/tighten";

describe("startTighten", () => {
  it("starts pulling back a short tail", () => {
    expect(startTighten({ pageCount: 3, tailLines: 6 })).toEqual({
      level: 1,
      baselinePages: 3,
      done: false,
    });
  });

  it("leaves full last pages and single-page articles alone", () => {
    expect(startTighten({ pageCount: 3, tailLines: 40 }).done).toBe(true);
    expect(startTighten({ pageCount: 1, tailLines: 4 }).done).toBe(true);
  });
});

describe("nextTighten", () => {
  const started = startTighten({ pageCount: 3, tailLines: 6 });

  it("keeps the level that saves the page", () => {
    expect(nextTighten(started, { pageCount: 2, tailLines: 50 })).toEqual({
      ...started,
      done: true,
    });
  });

  it("tries the next level while the page is still there", () => {
    expect(nextTighten(started, { pageCount: 3, tailLines: 3 }).level).toBe(2);
  });

  it("restores the original layout when no level works", () => {
    const strongest = { ...started, level: PRINT_TIGHTEN_MAX_LEVEL };
    expect(nextTighten(strongest, { pageCount: 3, tailLines: 2 })).toEqual({
      ...started,
      level: 0,
      done: true,
    });
  });
});
