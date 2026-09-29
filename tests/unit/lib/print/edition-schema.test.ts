import { describe, expect, it } from "vitest";

import { printEditionManifestSchema, printEditionStatusSchema } from "@/lib/print/edition-schema";

describe("print edition schema", () => {
  it("accepts a draft manifest with editorial overrides", () => {
    expect(
      printEditionManifestSchema.parse({
        issueId: "00000000-0000-0000-0000-000000000000",
        title: "Numero campione",
        issueNumber: "MW 01",
        format: "a4-portrait",
        pageCountMultiple: 4,
        overrides: [{ itemId: "article-1", preferredFamily: "rupture", lockedPage: 8 }],
      }).overrides[0]?.preferredFamily,
    ).toBe("rupture");
  });

  it("rejects an unknown editorial status", () => {
    expect(() => printEditionStatusSchema.parse("PUBLISHED")).toThrow();
  });
});
