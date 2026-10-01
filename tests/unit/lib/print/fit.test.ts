import { describe, expect, it } from "vitest";

import { distributeFitBudget, nextFitBudget } from "@/lib/print/fit";

describe("distributeFitBudget", () => {
  it("lets short items keep their text and splits the rest among long ones", () => {
    expect(distributeFitBudget([300, 5000, 8000], 3300)).toEqual([300, 1500, 1500]);
  });

  it("keeps everything when the budget is large enough", () => {
    expect(distributeFitBudget([100, 200], 1000)).toEqual([100, 200]);
  });

  it("splits evenly when every item is long", () => {
    expect(distributeFitBudget([9000, 9000, 9000], 3000)).toEqual([1000, 1000, 1000]);
  });
});

describe("nextFitBudget", () => {
  it("stops when the section fits", () => {
    expect(
      nextFitBudget({ fittedChars: 9000, overflowChars: 0, pageCount: 2 }, 2, 12000),
    ).toBeNull();
  });

  it("shrinks to the measured capacity when text spills over", () => {
    expect(nextFitBudget({ fittedChars: 8000, overflowChars: 4000, pageCount: 3 }, 2, 12000)).toBe(
      7520,
    );
  });

  it("shrinks the current budget when only the trailing block spills", () => {
    expect(nextFitBudget({ fittedChars: 8000, overflowChars: 0, pageCount: 3 }, 2, 8000)).toBe(
      7520,
    );
  });
});
