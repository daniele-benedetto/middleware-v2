import { describe, expect, it } from "vitest";

import { toPrefixTsQuery } from "@/lib/server/modules/search/query/prefix-tsquery";

describe("toPrefixTsQuery", () => {
  it("turns every word into a lowercase prefix term joined with AND", () => {
    expect(toPrefixTsQuery("Rivol Franc")).toBe("rivol:* & franc:*");
  });

  it("keeps accented letters and digits", () => {
    expect(toPrefixTsQuery("città 2026")).toBe("città:* & 2026:*");
  });

  it("strips tsquery operators and punctuation", () => {
    expect(toPrefixTsQuery("l'arte & (lotta) | !sciopero:*")).toBe("arte:* & lotta:* & sciopero:*");
  });

  it("returns null when no searchable word remains", () => {
    expect(toPrefixTsQuery("!! & a")).toBeNull();
  });

  it("caps the number of terms", () => {
    expect(toPrefixTsQuery("aa bb cc dd ee ff gg hh ii jj")?.split(" & ")).toHaveLength(8);
  });
});
