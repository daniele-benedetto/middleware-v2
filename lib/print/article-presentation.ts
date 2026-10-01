export type PrintTitleSegment = { text: string; accent: boolean; breakAfter: boolean };

export type PrintArticleRole = "opening" | "rupture" | "closing" | "body";

const roleLabels: Record<PrintArticleRole, string> = {
  opening: "Editoriale",
  rupture: "Approfondimenti",
  closing: "Editoriale",
  body: "Contributi",
};

/** Noun used by the "read it all online" invite, by editorial category. */
const ctaNouns: Record<string, string> = {
  interviste: "l’intera intervista",
  intervista: "l’intera intervista",
  contributi: "l’intero contributo",
  contributo: "l’intero contributo",
  editoriale: "l’intero editoriale",
  approfondimenti: "l’intero approfondimento",
  approfondimento: "l’intero approfondimento",
};

/** "“Quote”, Intervista a Sara": the quote becomes the headline, the rest the subtitle. */
const QUOTED_HEADLINE = /^(\s*“[^”]+”)\s*[,–—-]\s*(\S.*)$/;

export function resolvePrintArticleLabel(categoryName: string | null, role: PrintArticleRole) {
  return categoryName?.trim() || roleLabels[role];
}

export function resolvePrintArticleCta(categoryName: string | null) {
  const noun = ctaNouns[categoryName?.trim().toLowerCase() ?? ""] ?? "l’intero articolo";
  return `Leggi ${noun} su`;
}

function sliceSegments(segments: PrintTitleSegment[], end: number) {
  const result: PrintTitleSegment[] = [];
  let offset = 0;

  for (const segment of segments) {
    if (offset >= end) break;
    const text = segment.text.slice(0, end - offset);
    const complete = offset + segment.text.length <= end;
    result.push({ ...segment, text, breakAfter: complete && segment.breakAfter });
    offset += segment.text.length;
  }

  return result;
}

/**
 * Splits a quoted interview title into headline and subtitle, keeping the
 * accent segments of the styled title inside the quote.
 */
export function splitPrintHeadline(segments: PrintTitleSegment[]): {
  headline: PrintTitleSegment[];
  subtitle: string | null;
} {
  const match = QUOTED_HEADLINE.exec(segments.map((segment) => segment.text).join(""));
  if (!match) return { headline: segments, subtitle: null };

  return { headline: sliceSegments(segments, match[1]!.length), subtitle: match[2]!.trim() };
}
