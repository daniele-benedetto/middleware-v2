import { describe, expect, it } from "vitest";

import { canExpandPreview, initialPreviewBudget } from "@/lib/print/preview-budget";

describe("preview text budget", () => {
  it("reserves a substantial portion for reading through the QR", () => {
    expect(initialPreviewBudget(6600)).toBe(5940);
    expect(canExpandPreview(6600, 1700)).toBe(true);
    expect(canExpandPreview(6600, 5800)).toBe(false);
  });

  it("keeps a short article complete so it can be printed without a QR", () => {
    expect(initialPreviewBudget(900)).toBe(900);
    expect(canExpandPreview(900, 900)).toBe(false);
    expect(initialPreviewBudget(1200)).toBe(600);
    expect(canExpandPreview(1200, 600)).toBe(false);
  });
});
