import { describe, expect, it } from "vitest";

import { nextNudge, PRINT_NUDGE_MAX_LEVEL, startNudge } from "@/lib/print/nudge";

describe("print nudge", () => {
  it("starts only when the opening page has no text", () => {
    expect(startNudge({ pageCount: 3, openingHasText: false })).toEqual({ level: 1, done: false });
    expect(startNudge({ pageCount: 3, openingHasText: true }).done).toBe(true);
    expect(startNudge({ pageCount: 1, openingHasText: false }).done).toBe(true);
  });

  it("keeps the first step that brings the text back", () => {
    expect(nextNudge({ level: 2, done: false }, { pageCount: 3, openingHasText: true })).toEqual({
      level: 2,
      done: true,
    });
  });

  it("tries the next step, then gives up and restores the layout", () => {
    expect(
      nextNudge({ level: 1, done: false }, { pageCount: 3, openingHasText: false }).level,
    ).toBe(2);
    expect(
      nextNudge(
        { level: PRINT_NUDGE_MAX_LEVEL, done: false },
        { pageCount: 3, openingHasText: false },
      ),
    ).toEqual({ level: 0, done: true });
  });
});
