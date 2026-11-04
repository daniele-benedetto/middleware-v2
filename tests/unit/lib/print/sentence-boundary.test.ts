import { describe, expect, it } from "vitest";

import { nearestPrintSentenceEnd } from "@/lib/print/sentence-boundary";

describe("nearestPrintSentenceEnd", () => {
  it("finishes the last complete sentence within the preview budget", () => {
    expect(
      nearestPrintSentenceEnd("Primo periodo. Secondo periodo completo. Terzo sospeso", 45),
    ).toBe(40);
  });

  it("falls back to a word when a sentence would waste too much space", () => {
    expect(nearestPrintSentenceEnd(`Fine. ${"parole ".repeat(90)}`, 560, 100)).toBeNull();
  });
});
