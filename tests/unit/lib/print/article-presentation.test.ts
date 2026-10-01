import { describe, expect, it } from "vitest";

import {
  resolvePrintArticleCta,
  resolvePrintArticleLabel,
  splitPrintHeadline,
} from "@/lib/print/article-presentation";

describe("splitPrintHeadline", () => {
  it("keeps the styled accent inside the quoted headline", () => {
    expect(
      splitPrintHeadline([
        { text: "“Non devi aver ", accent: false, breakAfter: false },
        { text: "paura", accent: true, breakAfter: false },
        { text: " di vivere il tuo posto”, Intervista a Sara", accent: false, breakAfter: false },
      ]),
    ).toEqual({
      headline: [
        { text: "“Non devi aver ", accent: false, breakAfter: false },
        { text: "paura", accent: true, breakAfter: false },
        { text: " di vivere il tuo posto”", accent: false, breakAfter: false },
      ],
      subtitle: "Intervista a Sara",
    });
  });

  it("leaves regular titles untouched", () => {
    const segments = [{ text: "Scomporre la sicurezza", accent: false, breakAfter: false }];
    expect(splitPrintHeadline(segments)).toEqual({ headline: segments, subtitle: null });
  });
});

describe("article labels", () => {
  it("prefers the category and falls back to the block role", () => {
    expect(resolvePrintArticleLabel("Contributi", "body")).toBe("Contributi");
    expect(resolvePrintArticleLabel(null, "rupture")).toBe("Approfondimenti");
  });

  it("invites to read the whole piece according to its category", () => {
    expect(resolvePrintArticleCta("Interviste")).toBe("Leggi l’intera intervista su");
    expect(resolvePrintArticleCta("Contributi")).toBe("Leggi l’intero contributo su");
    expect(resolvePrintArticleCta("Rubrica")).toBe("Leggi l’intero articolo su");
  });
});
