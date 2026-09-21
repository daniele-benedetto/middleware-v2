import { getScrollProgress } from "@/components/public/public-scroll-progress";

describe("getScrollProgress", () => {
  it("returns zero when the document cannot scroll", () => {
    expect(getScrollProgress(0, 0)).toBe(0);
    expect(getScrollProgress(120, -10)).toBe(0);
  });

  it("calculates progress within the document bounds", () => {
    expect(getScrollProgress(150, 600)).toBe(0.25);
    expect(getScrollProgress(-20, 600)).toBe(0);
    expect(getScrollProgress(800, 600)).toBe(1);
  });
});
