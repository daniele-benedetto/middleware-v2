import { describe, expect, it } from "vitest";

import { nextFigurePlacement } from "@/lib/print/inline-figures";

const forward = (block: number) => ({ block, backward: false });
const backward = (block: number) => ({ block, backward: true });

describe("print inline figures", () => {
  it("keeps an image that fits", () => {
    expect(
      nextFigurePlacement(forward(3), { overflows: false, lastBlockOnPage: 5 }, 10),
    ).toBeNull();
  });

  it("moves an overflowing image before the first block of the next page", () => {
    expect(nextFigurePlacement(forward(3), { overflows: true, lastBlockOnPage: 5 }, 10)).toEqual(
      forward(6),
    );
  });

  it("always moves at least one block forward", () => {
    expect(nextFigurePlacement(forward(3), { overflows: true, lastBlockOnPage: null }, 10)).toEqual(
      forward(4),
    );
  });

  it("moves back when no block is left after the image", () => {
    expect(nextFigurePlacement(forward(8), { overflows: true, lastBlockOnPage: 9 }, 10)).toEqual(
      backward(7),
    );
    expect(nextFigurePlacement(backward(7), { overflows: true, lastBlockOnPage: 9 }, 10)).toEqual(
      backward(6),
    );
  });

  it("gives up before the first block", () => {
    expect(nextFigurePlacement(backward(0), { overflows: true, lastBlockOnPage: 0 }, 1)).toBeNull();
  });
});
