import { describe, expect, it } from "vitest";

import { truncatePrintRichText } from "@/lib/print/rich-truncate";

const paragraph = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });

describe("truncatePrintRichText", () => {
  it("keeps whole blocks until the budget is reached", () => {
    const doc = {
      type: "doc",
      content: [paragraph("a".repeat(40)), paragraph("b".repeat(40)), paragraph("c")],
    };

    expect(truncatePrintRichText(doc, 50)).toEqual({
      type: "doc",
      content: [paragraph("a".repeat(40)), paragraph("b".repeat(40))],
    });
  });

  it("leaves non-documents untouched", () => {
    expect(truncatePrintRichText(null, 10)).toBeNull();
  });
});
