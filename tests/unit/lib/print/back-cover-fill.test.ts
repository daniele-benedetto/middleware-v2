import { describe, expect, it } from "vitest";

import { countBackCoverFillers } from "@/lib/print/back-cover-fill";

describe("countBackCoverFillers", () => {
  it("adds the blank pages that close the booklet on the back cover", () => {
    expect(countBackCoverFillers(36, 0)).toBe(0);
    expect(countBackCoverFillers(33, 0)).toBe(3);
    expect(countBackCoverFillers(34, 0)).toBe(2);
    expect(countBackCoverFillers(35, 0)).toBe(1);
  });

  it("ignores the blank pages added in the previous pass", () => {
    expect(countBackCoverFillers(36, 3)).toBe(3);
    expect(countBackCoverFillers(36, 2)).toBe(2);
    expect(countBackCoverFillers(38, 2)).toBe(0);
  });
});
