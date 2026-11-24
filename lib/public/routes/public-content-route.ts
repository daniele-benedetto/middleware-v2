export type PublicContentRoute =
  | { kind: "article"; slug: string; listen: boolean }
  | { kind: "issue"; slug: string }
  | { kind: "course"; courseSlug: string }
  | { kind: "lesson"; courseSlug: string; lessonSlug: string; listen: boolean }
  | { kind: "staticPage"; slug: string }
  | { kind: "questionnaire"; slug: string };

export const PUBLIC_NOT_FOUND_PATH = "/non-trovato";

export const RESERVED_TOP_LEVEL_SEGMENTS: ReadonlySet<string> = new Set([
  "api",
  "articoli",
  "cms",
  "contro-formazione",
  "non-trovato",
  "uscite",
]);

const LISTEN_SEGMENT = "ascolta";

function splitPathname(pathname: string): string[] | null {
  try {
    return pathname
      .split("/")
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment));
  } catch {
    return null;
  }
}

function resolveStaticPage(segment: string): PublicContentRoute | null {
  if (RESERVED_TOP_LEVEL_SEGMENTS.has(segment) || segment.includes(".")) {
    return null;
  }

  return { kind: "staticPage", slug: segment };
}

function resolveArticle(rest: string[]): PublicContentRoute | null {
  const [slug, suffix, ...extra] = rest;
  if (!slug || extra.length > 0) return null;
  if (suffix === undefined) return { kind: "article", slug, listen: false };
  return suffix === LISTEN_SEGMENT ? { kind: "article", slug, listen: true } : null;
}

function resolveIssue(rest: string[]): PublicContentRoute | null {
  const [slug, ...extra] = rest;
  return slug && extra.length === 0 ? { kind: "issue", slug } : null;
}

function resolveControFormazione(rest: string[]): PublicContentRoute | null {
  const [courseSlug, lessonSlug, suffix, ...extra] = rest;
  if (!courseSlug || extra.length > 0) return null;
  if (lessonSlug === undefined) return { kind: "course", courseSlug };
  if (suffix === undefined) return { kind: "lesson", courseSlug, lessonSlug, listen: false };
  return suffix === LISTEN_SEGMENT
    ? { kind: "lesson", courseSlug, lessonSlug, listen: true }
    : null;
}

function resolveQuestionnaire(rest: string[]): PublicContentRoute | null {
  const [slug, ...extra] = rest;
  return slug && extra.length === 0 ? { kind: "questionnaire", slug } : null;
}

export function resolvePublicContentRoute(pathname: string): PublicContentRoute | null {
  const segments = splitPathname(pathname);
  if (!segments || segments.length === 0) return null;

  const [first, ...rest] = segments;

  if (rest.length === 0) {
    return resolveStaticPage(first);
  }

  switch (first) {
    case "articoli":
      return resolveArticle(rest);
    case "uscite":
      return resolveIssue(rest);
    case "contro-formazione":
      return resolveControFormazione(rest);
    case "questionari":
      return resolveQuestionnaire(rest);
    default:
      return null;
  }
}
