import { describe, expect, it } from "vitest";

import { isLongPublicTitle } from "@/lib/public/title-scale";

describe("isLongPublicTitle", () => {
  it("recognizes a long eight-word title with a nonbreaking place name", () => {
    expect(isLongPublicTitle("Perché un’inchiesta sul lavoro sociale nella Sacca-Crocetta?")).toBe(
      true,
    );
  });

  it("preserves the existing scale for shorter titles", () => {
    expect(isLongPublicTitle("Sicurezza contesa")).toBe(false);
  });
});
