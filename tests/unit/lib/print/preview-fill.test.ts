import { describe, expect, it } from "vitest";

import { nextPreviewFill, startPreviewFill } from "@/lib/print/preview-fill";

describe("preview text fitting", () => {
  it("searches upward from a conservative fit until the QR gap is balanced", () => {
    const first = startPreviewFill(3000, 6000)!;
    expect(first.current).toBe(4500);
    const next = nextPreviewFill(first, { fits: true, gapLines: 8 });
    expect(next.state?.current).toBe(5250);
    expect(nextPreviewFill(next.state!, { fits: true, gapLines: 2.5 })).toEqual({
      state: null,
      budget: null,
    });
  });

  it("backs off when the extra copy pushes the QR away or leaves too little clearance", () => {
    const first = startPreviewFill(3000, 6000)!;
    expect(nextPreviewFill(first, { fits: false, gapLines: null }).state?.current).toBe(3750);
    expect(nextPreviewFill(first, { fits: true, gapLines: 1 }).state?.current).toBe(3750);
  });

  it("does not probe when there is no meaningful extra copy", () => {
    expect(startPreviewFill(5900, 5940)).toBeNull();
  });
});
