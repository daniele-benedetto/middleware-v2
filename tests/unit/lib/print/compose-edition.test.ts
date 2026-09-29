import { describe, expect, it } from "vitest";

import { buildEditionIndex, composePrintEdition } from "@/lib/print/compose-edition";
import { buildPrintEditionManifest } from "@/lib/print/issue-manifest";

describe("composePrintEdition", () => {
  it("creates cover, index and article pages from authored rich text", () => {
    const manifest = buildPrintEditionManifest({
      issueId: "issue-1",
      issueNumber: "MW 01",
      title: "Il lavoro",
      articles: [{ id: "article-1", title: "Apertura", readingTimeMinutes: 1 }],
      homeBlocks: [{ type: "opening", articleIds: ["article-1"] }],
    });

    const result = composePrintEdition(manifest, [
      {
        id: "article-1",
        title: "Apertura",
        excerpt: "Un estratto.",
        authorName: "Autrice",
        contentRich: {
          type: "doc",
          content: [
            { type: "heading", content: [{ type: "text", text: "Inizio" }] },
            { type: "paragraph", content: [{ type: "text", text: "Testo composto." }] },
          ],
        },
      },
    ]);

    expect(result.pages.map((page) => page.family)).toEqual([
      "cover",
      "index",
      "issue-opener",
      "blank",
      "article-opener",
      "blank",
      "blank",
      "blank",
    ]);
    expect(result.pages[4]?.blocks.map((block) => block.kind)).toEqual(["heading", "paragraph"]);
    expect(buildEditionIndex(result.pages)).toEqual([
      { itemId: "issue-1:opener", title: "Il lavoro", page: 3, section: "opening" },
      { itemId: "article-1", title: "Apertura", page: 5, section: "opening" },
    ]);
  });

  it("pads the composed number to a multiple of four", () => {
    const manifest = buildPrintEditionManifest({
      issueId: "issue-1",
      issueNumber: "MW 01",
      title: "Il lavoro",
      articles: [],
    });

    const result = composePrintEdition(manifest, []);

    expect(result.pages).toHaveLength(4);
    expect(result.pages.at(-1)?.family).toBe("blank");
    expect(result.warnings[0]).toContain("pagine bianche");
  });
});
