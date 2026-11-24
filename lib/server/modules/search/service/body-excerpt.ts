const DEFAULT_MAX_WORDS = 40;

export function bodyExcerpt(body: string | null, maxWords = DEFAULT_MAX_WORDS): string | null {
  const words = body?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (words.length === 0) return null;

  const excerpt = words.slice(0, maxWords).join(" ");
  return words.length > maxWords ? `${excerpt}…` : excerpt;
}
