import { describe, expect, it } from "vitest";

import { buildPrintMapDirectoryLayout } from "@/lib/print/map-directory";

describe("buildPrintMapDirectoryLayout", () => {
  it("shares one page between all rows and gives the excerpts the remaining lines", () => {
    const ten = buildPrintMapDirectoryLayout(10);
    const four = buildPrintMapDirectoryLayout(4);

    expect(ten.rowHeightMm * 5).toBeLessThanOrEqual(170);
    expect(ten.excerptLines).toBe(4);
    expect(four.excerptLines).toBeGreaterThan(ten.excerptLines * 2);
  });

  it("leaves no excerpt lines when the points cannot fit one page", () => {
    expect(buildPrintMapDirectoryLayout(40).excerptLines).toBe(0);
  });
});
