import { describe, expect, it } from "vitest";

import { extractPrintParagraphs } from "@/lib/print/content";

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
