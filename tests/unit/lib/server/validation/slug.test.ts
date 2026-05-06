import { normalizeSlug } from "@/lib/server/validation/slug";

describe("normalizeSlug", () => {
  it("normalizes case, spacing and punctuation", () => {
    expect(normalizeSlug("  Hello, World!  ")).toBe("hello-world");
  });

  it("collapses repeated separators", () => {
    expect(normalizeSlug("foo---bar   baz")).toBe("foo-bar-baz");
  });

  it("returns an empty string when nothing valid remains", () => {
    expect(normalizeSlug(" !!! ")).toBe("");
  });
});
