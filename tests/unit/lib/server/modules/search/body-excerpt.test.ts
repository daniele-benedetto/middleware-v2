import { describe, expect, it } from "vitest";

import { bodyExcerpt } from "@/lib/server/modules/search/service/body-excerpt";

describe("bodyExcerpt", () => {
  it("returns the whole text when it fits", () => {
    expect(bodyExcerpt("  Uno   due\ntre ", 5)).toBe("Uno due tre");
  });

  it("truncates to the word limit with an ellipsis", () => {
    expect(bodyExcerpt("uno due tre quattro", 2)).toBe("uno due…");
  });

  it("returns null for empty bodies", () => {
    expect(bodyExcerpt(null)).toBeNull();
    expect(bodyExcerpt("   ")).toBeNull();
  });
});
