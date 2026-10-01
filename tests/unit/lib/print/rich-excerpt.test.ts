import { describe, expect, it } from "vitest";

import { toPrintTextRuns } from "@/lib/print/rich-excerpt";

const strip = (text: string) => text.replaceAll("­", "");

describe("toPrintTextRuns", () => {
  it("flattens paragraphs into one inline excerpt and keeps bold and italic", () => {
    const runs = toPrintTextRuns({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "📍 Sacca, " },
            { type: "text", text: "Modena", marks: [{ type: "bold" }] },
          ],
        },
        { type: "heading", content: [{ type: "text", text: "Chi" }] },
        {
          type: "paragraph",
          content: [{ type: "text", text: "cooperativa", marks: [{ type: "italic" }] }],
        },
      ],
    });

    expect(runs.map((run) => [strip(run.text), run.bold, run.italic])).toEqual([
      ["Sacca, ", false, false],
      ["Modena", true, false],
      [" ", false, false],
      ["Chi", true, false],
      [" ", false, false],
      ["cooperativa", false, true],
    ]);
  });

  it("returns no runs for empty content", () => {
    expect(toPrintTextRuns(null)).toEqual([]);
    expect(toPrintTextRuns({ type: "doc", content: [] })).toEqual([]);
  });
});
