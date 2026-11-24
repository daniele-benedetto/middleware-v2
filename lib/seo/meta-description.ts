export const META_DESCRIPTION_MAX_LENGTH = 160;

const ELLIPSIS = "…";
const TRAILING_PUNCTUATION = /[\s,;:.!?\-–—]+$/u;

export function toMetaDescription(
  value: string | null | undefined,
  maxLength = META_DESCRIPTION_MAX_LENGTH,
): string | undefined {
  const normalized = value?.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return undefined;
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const hardCut = normalized.slice(0, maxLength - ELLIPSIS.length);
  const lastSpace = hardCut.lastIndexOf(" ");
  const wordCut = lastSpace > 0 ? hardCut.slice(0, lastSpace) : hardCut;

  return `${wordCut.replace(TRAILING_PUNCTUATION, "")}${ELLIPSIS}`;
}
