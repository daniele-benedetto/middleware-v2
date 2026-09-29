import { describe, expect, it } from "vitest";

import { planPrintEdition } from "@/lib/print/pagination";

describe("planPrintEdition", () => {
  it("creates a deterministic semantic sequence and continuation pages", () => {
    const result = planPrintEdition({
      issueId: "issue-1",
      title: "Il lavoro",
      issueNumber: "01",
      format: "a4-portrait",
      pageCountMultiple: 4,
      items: [
        {
          id: "opening",
          kind: "article",
          title: "Apertura",
          section: "opening",
          estimatedWords: 1300,
          preferredFamily: "article-opener",
        },
        {
          id: "map",
          kind: "map",
          title: "Mappa del lavoro",
          section: "special",
          estimatedWords: 0,
          preferredFamily: "map-plate",
        },
      ],
    });

    expect(result.pages).toEqual([
      {
        page: 1,
        family: "article-opener",
        itemId: "opening",
        itemTitle: "Apertura",
        continuation: false,
      },
      {
        page: 2,
        family: "article-continuation",
        itemId: "opening",
        itemTitle: "Apertura",
        continuation: true,
      },
      {
        page: 3,
        family: "map-plate",
        itemId: "map",
        itemTitle: "Mappa del lavoro",
        continuation: false,
      },
    ]);
    expect(result.diagnostics).toEqual([]);
  });

  it("reports editorial problems instead of hiding them", () => {
    const result = planPrintEdition({
      issueId: "issue-1",
      title: "",
      issueNumber: "01",
      format: "a4-portrait",
      pageCountMultiple: 4,
      items: [
        {
          id: "article-1",
          kind: "article",
          title: "",
          section: "body",
          estimatedWords: 0,
          preferredFamily: "article-opener",
          lockedPage: 1,
        },
      ],
    });

    expect(result.diagnostics.map((item) => item.code)).toEqual(["missing-title", "empty-content"]);
  });
});
