import { describe, expect, it } from "vitest";

import { prependPrintLeadParagraph } from "@/lib/print/lead-paragraph";

const paragraph = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });

describe("prependPrintLeadParagraph", () => {
  it("opens the text with the excerpt as a plain paragraph", () => {
    expect(
      prependPrintLeadParagraph({ type: "doc", content: [paragraph("Testo")] }, " Sommario "),
    ).toEqual({ type: "doc", content: [paragraph("Sommario"), paragraph("Testo")] });
  });

  it("keeps the text as it is without an excerpt", () => {
    const value = { type: "doc", content: [paragraph("Testo")] };

    expect(prependPrintLeadParagraph(value, null)).toBe(value);
    expect(prependPrintLeadParagraph(value, "  ")).toBe(value);
  });

  it("prints the excerpt alone when the article has no text", () => {
    expect(prependPrintLeadParagraph(null, "Sommario")).toEqual({
      type: "doc",
      content: [paragraph("Sommario")],
    });
  });
});
