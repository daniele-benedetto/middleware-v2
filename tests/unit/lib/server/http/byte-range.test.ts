import { parseByteRangeHeader } from "@/lib/server/http/byte-range";

describe("parseByteRangeHeader", () => {
  it("parses bounded ranges", () => {
    expect(parseByteRangeHeader("bytes=10-19", 100)).toEqual({ start: 10, end: 19, size: 10 });
  });

  it("parses open-ended ranges", () => {
    expect(parseByteRangeHeader("bytes=90-", 100)).toEqual({ start: 90, end: 99, size: 10 });
  });

  it("parses suffix ranges", () => {
    expect(parseByteRangeHeader("bytes=-10", 100)).toEqual({ start: 90, end: 99, size: 10 });
  });

  it("rejects invalid ranges", () => {
    expect(parseByteRangeHeader("bytes=200-300", 100)).toBe("invalid");
    expect(parseByteRangeHeader("items=0-10", 100)).toBe("invalid");
  });
});
