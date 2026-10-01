import { describe, expect, it } from "vitest";

import { buildBookletPlan } from "@/lib/print/booklet";

describe("buildBookletPlan", () => {
  it("imposes eight pages on two A3 sheets", () => {
    expect(buildBookletPlan(8)).toEqual({
      pageCount: 8,
      paddedPageCount: 8,
      sheets: [
        { front: { left: 8, right: 1 }, back: { left: 2, right: 7 } },
        { front: { left: 6, right: 3 }, back: { left: 4, right: 5 } },
      ],
    });
  });

  it("pads the booklet with blank pages up to a multiple of four", () => {
    const plan = buildBookletPlan(10);

    expect(plan.paddedPageCount).toBe(12);
    expect(
      plan.sheets.flatMap(({ front, back }) => [front.left, front.right, back.left, back.right]),
    ).toEqual([null, 1, 2, null, 10, 3, 4, 9, 8, 5, 6, 7]);
  });

  it("keeps a single sheet for very short documents", () => {
    expect(buildBookletPlan(1).sheets).toEqual([
      { front: { left: null, right: 1 }, back: { left: null, right: null } },
    ]);
  });
});
