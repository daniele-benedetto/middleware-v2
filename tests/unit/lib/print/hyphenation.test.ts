import { describe, expect, it } from "vitest";

import { hyphenatePrintRichText, hyphenatePrintText } from "@/lib/print/hyphenation";

const SOFT_HYPHEN = "­";

describe("hyphenatePrintText", () => {
  it("inserts Italian soft hyphens without changing the visible text", () => {
    const result = hyphenatePrintText("Mobilitazione nel quartiere");

    expect(result).toContain(SOFT_HYPHEN);
    expect(result.replaceAll(SOFT_HYPHEN, "")).toBe("Mobilitazione nel quartiere");
  });

  it("leaves URLs, emails and numbers untouched", () => {
    expect(hyphenatePrintText("https://middleware.media redazione@middleware.media 2026")).toBe(
      "https://middleware.media redazione@middleware.media 2026",
    );
  });
});

describe("hyphenatePrintRichText", () => {
  it("hyphenates text nodes and skips links", () => {
    const result = hyphenatePrintRichText({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Trasformazioni" },
            { type: "text", text: "Collegamento", marks: [{ type: "link", attrs: { href: "/" } }] },
          ],
        },
      ],
    }) as { content: Array<{ content: Array<{ text: string }> }> };

    const [plain, link] = result.content[0]!.content;
    expect(plain!.text).toContain(SOFT_HYPHEN);
    expect(link!.text).toBe("Collegamento");
  });
});
