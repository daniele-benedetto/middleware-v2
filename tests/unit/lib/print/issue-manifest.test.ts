import { describe, expect, it } from "vitest";

import { applyPrintEditionOverrides, buildPrintEditionManifest } from "@/lib/print/issue-manifest";

describe("buildPrintEditionManifest", () => {
  it("preserves issue order and converts reading time into article capacity", () => {
    const manifest = buildPrintEditionManifest({
      issueId: "issue-1",
      issueNumber: "MW 01",
      title: "Il lavoro",
      articles: [
        { id: "article-1", title: "Apertura", readingTimeMinutes: 4 },
        { id: "article-2", title: "Secondo articolo", readingTimeMinutes: 2 },
      ],
      maps: [{ id: "map-1", title: "Una mappa" }],
      homeBlocks: [
        { type: "map", mapId: "map-1" },
        { type: "body", articleIds: ["article-2", "article-1"] },
      ],
    });

    expect(manifest.items.map((item) => item.preferredFamily)).toEqual([
      "issue-opener",
      "map-plate",
      "text-spread",
      "text-spread",
    ]);
    expect(manifest.items[1]?.title).toBe("Una mappa");
    expect(manifest.items[2]?.estimatedWords).toBe(440);
    expect(manifest.items[3]?.startsOnRight).toBe(false);
  });

  it("applies persisted editorial overrides without mutating the source manifest", () => {
    const manifest = buildPrintEditionManifest({
      issueId: "issue-1",
      issueNumber: "MW 01",
      title: "Il lavoro",
      articles: [{ id: "article-1", title: "Apertura", readingTimeMinutes: 4 }],
    });
    const edited = applyPrintEditionOverrides(manifest, {
      overrides: [{ itemId: "article-1", preferredFamily: "rupture", lockedPage: 8 }],
    });

    expect(edited.items[1]?.preferredFamily).toBe("rupture");
    expect(edited.items[1]?.lockedPage).toBe(8);
    expect(manifest.items[1]?.preferredFamily).toBe("text-spread");
  });
});
