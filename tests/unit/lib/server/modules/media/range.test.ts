import {
  buildUnsatisfiedRangeHeader,
  parseMediaRangeHeader,
} from "@/lib/server/modules/media/range";

describe("parseMediaRangeHeader", () => {
  it("returns null when the range header is missing", () => {
    expect(parseMediaRangeHeader(null, 100)).toBeNull();
  });

  it("parses bounded byte ranges", () => {
    expect(parseMediaRangeHeader("bytes=10-19", 100)).toEqual({
      start: 10,
      end: 19,
      header: "bytes=10-19",
    });
  });

  it("clamps open ended byte ranges to object size", () => {
    expect(parseMediaRangeHeader("bytes=90-", 100)).toEqual({
      start: 90,
      end: 99,
      header: "bytes=90-99",
    });
  });

  it("parses suffix byte ranges", () => {
    expect(parseMediaRangeHeader("bytes=-10", 100)).toEqual({
      start: 90,
      end: 99,
      header: "bytes=90-99",
    });
  });

  it("returns null for unsupported or unsatisfiable ranges", () => {
    expect(parseMediaRangeHeader("items=0-10", 100)).toBeNull();
    expect(parseMediaRangeHeader("bytes=100-101", 100)).toBeNull();
    expect(parseMediaRangeHeader("bytes=20-10", 100)).toBeNull();
    expect(parseMediaRangeHeader("bytes=0-1", 0)).toBeNull();
  });
});

describe("buildUnsatisfiedRangeHeader", () => {
  it("builds a content-range header for 416 responses", () => {
    expect(buildUnsatisfiedRangeHeader(100)).toBe("bytes */100");
    expect(buildUnsatisfiedRangeHeader(-1)).toBe("bytes */0");
  });
});
