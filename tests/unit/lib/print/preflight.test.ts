import { describe, expect, it } from "vitest";

import { composePrintEdition } from "@/lib/print/compose-edition";
import { buildPrintEditionManifest } from "@/lib/print/issue-manifest";
import { runPrintPreflight } from "@/lib/print/preflight";

describe("runPrintPreflight", () => {
  it("blocks missing article content and warns about unsupported rich text", () => {
    const manifest = buildPrintEditionManifest({
      issueId: "issue-1",
      issueNumber: "MW 01",
      title: "Numero",
      articles: [
        { id: "article-1", title: "Saggio", readingTimeMinutes: 1 },
        { id: "article-2", title: "Vuoto", readingTimeMinutes: 1 },
      ],
      homeBlocks: [{ type: "body", articleIds: ["article-1", "article-2"] }],
    });
    const composition = composePrintEdition(manifest, [
      {
        id: "article-1",
        title: "Saggio",
        excerpt: null,
        authorName: null,
        contentRich: {
          type: "doc",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "Testo" }] },
            { type: "codeBlock", content: [{ type: "text", text: "codice" }] },
          ],
        },
      },
      {
        id: "article-2",
        title: "Vuoto",
        excerpt: null,
        authorName: null,
        contentRich: { type: "doc", content: [] },
      },
    ]);

    const result = runPrintPreflight({
      manifest,
      composition,
      articles: [
        {
          id: "article-1",
          title: "Saggio",
          excerpt: null,
          authorName: null,
          contentRich: {
            type: "doc",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "Testo" }] },
              { type: "codeBlock", content: [{ type: "text", text: "codice" }] },
            ],
          },
        },
        {
          id: "article-2",
          title: "Vuoto",
          excerpt: null,
          authorName: null,
          contentRich: { type: "doc", content: [] },
        },
      ],
    });

    expect(result.blocking).toBe(true);
    expect(result.issues.map((issue) => issue.code)).toContain("missing-content");
    expect(result.issues.map((issue) => issue.code)).toContain("unsupported-rich-text");
  });
});
