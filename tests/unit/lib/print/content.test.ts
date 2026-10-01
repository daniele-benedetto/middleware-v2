import { describe, expect, it } from "vitest";

import {
  extractPrintParagraphs,
  splitPrintContent,
  splitPrintContentByCapacity,
} from "@/lib/print/content";

describe("extractPrintParagraphs", () => {
  it("keeps authored paragraph order and ignores empty blocks", () => {
    expect(
      extractPrintParagraphs({
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: " Primo " }] },
          { type: "heading", content: [{ type: "text", text: "Intertitolo" }] },
          { type: "paragraph", content: [] },
          { type: "paragraph", content: [{ type: "text", text: "Secondo" }] },
        ],
      }),
    ).toEqual(["Primo", "Secondo"]);
  });
});

describe("splitPrintContent", () => {
  it("keeps rich text blocks in order across physical page candidates", () => {
    const value = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "12345" }] },
        { type: "paragraph", content: [{ type: "text", text: "67890" }] },
        { type: "paragraph", content: [{ type: "text", text: "fine" }] },
      ],
    };

    expect(
      splitPrintContent(value, 10).map((page) => (page as { content: unknown[] }).content),
    ).toEqual([value.content.slice(0, 2), value.content.slice(2)]);
  });

  it("continues for as many pages as the authored content requires", () => {
    const value = {
      type: "doc",
      content: Array.from({ length: 7 }, (_, index) => ({
        type: "paragraph",
        content: [{ type: "text", text: `Paragrafo ${index}xxxxx` }],
      })),
    };

    expect(splitPrintContent(value, 10)).toHaveLength(7);
  });

  it("uses a smaller capacity for a first page with editorial chrome", () => {
    const value = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "12345678" }] },
        { type: "paragraph", content: [{ type: "text", text: "abcdefgh" }] },
      ],
    };

    expect(splitPrintContentByCapacity(value, 10, 20)).toHaveLength(2);
  });

  it("keeps a long paragraph intact", () => {
    const value = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "uno due tre quattro" }] }],
    };

    const pages = splitPrintContentByCapacity(value, 8, 8) as Array<{
      content: Array<{ content: Array<{ text: string }> }>;
    }>;

    expect(pages).toHaveLength(1);
    expect(pages[0].content[0].content[0].text).toBe("uno due tre quattro");
  });
});
