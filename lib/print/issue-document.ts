import { getIssueBlockAnchorId } from "@/lib/issues/block-anchor";
import { isArticleHomeBlock, isSingleArticleBlock } from "@/lib/issues/home-block-rules";
import {
  resolvePrintArticleCta,
  resolvePrintArticleLabel,
  splitPrintHeadline,
  type PrintArticleRole,
  type PrintTitleSegment,
} from "@/lib/print/article-presentation";
import { buildPrintCampaign } from "@/lib/print/campaign";
import { hyphenatePrintRichText, hyphenatePrintText } from "@/lib/print/hyphenation";
import {
  buildPrintMapDirectoryLayout,
  type PrintMapDirectoryLayout,
} from "@/lib/print/map-directory";
import { buildPrintMapPlate, type PrintMapPlate } from "@/lib/print/map-plate";
import { toPrintTextRuns, type PrintTextRun } from "@/lib/print/rich-excerpt";
import { truncatePrintRichText } from "@/lib/print/rich-truncate";
import { resolvePrintDarkTone } from "@/lib/print/theme";
import { extractPlainText } from "@/lib/rich-text/plain-text";

import type {
  IssueHomeArticlePrintLayout,
  IssueHomeBlocks,
  IssueHomeVariant,
  IssuePrintSettings,
  IssueTitleStyled,
} from "@/lib/server/modules/issues/schema";

export type { PrintArticleRole, PrintTitleSegment } from "@/lib/print/article-presentation";

export type PrintArticleSource = {
  id: string;
  slug: string;
  title: string;
  titleStyled: IssueTitleStyled | null;
  excerpt: string | null;
  authorName: string | null;
  categoryName: string | null;
  contentRich: unknown;
  imageUrl: string | null;
  imageAlt: string | null;
};

export type PrintCourseSource = {
  id: string;
  slug: string;
  title: string;
  titleStyled: IssueTitleStyled | null;
  description: unknown;
  lessons: Array<{
    id: string;
    title: string;
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    sortOrder: number;
    excerptRich: unknown;
    excerpt: string | null;
    contentRich: unknown;
  }>;
};

export type PrintMapSource = {
  id: string;
  title: string;
  titleStyled: IssueTitleStyled | null;
  descriptionRich: unknown;
  items: Array<{
    id: string;
    title: string;
    descriptionRich: unknown;
    latitude: string;
    longitude: string;
    sortOrder: number;
  }>;
};

export type PrintIssueSource = {
  slug: string;
  title: string;
  titleStyled: IssueTitleStyled | null;
  description: unknown;
  publishedAt: string | null;
  homeBlocks: IssueHomeBlocks | null;
  homeVariant: IssueHomeVariant;
  printSettings: IssuePrintSettings;
};

export type PrintImage = { url: string; alt: string };

type PrintSectionSettings = { stopWithSiteCta: boolean; showInIssueIntro: boolean };

export type PrintArticleSection = PrintSectionSettings & {
  kind: "article";
  anchor: string;
  role: PrintArticleRole;
  label: string;
  title: PrintTitleSegment[];
  subtitle: string | null;
  plainTitle: string;
  deck: string | null;
  author: string;
  image: PrintImage | null;
  content: unknown;
  articlePath: string;
  ctaLabel: string;
  /** "fullscreen": the first page holds only photo, title and deck. */
  layout: IssueHomeArticlePrintLayout;
  /** Requested fullscreen without a photo: printed with the standard layout. */
  layoutFallback: boolean;
  dark: boolean;
};

export type PrintMapEntry = {
  id: string;
  label: string;
  title: string;
  excerpt: PrintTextRun[];
};

export type PrintMapSection = PrintSectionSettings & {
  kind: "map";
  anchor: string;
  label: string;
  title: PrintTitleSegment[];
  plainTitle: string;
  deck: string | null;
  plate: PrintMapPlate;
  entries: PrintMapEntry[];
  directory: PrintMapDirectoryLayout;
  /** The map block on the public issue page. */
  sitePath: string;
};

export type PrintCourseLesson = {
  id: string;
  label: string;
  title: string;
  lead: PrintTextRun[];
  content: unknown;
};

export type PrintCourseSection = PrintSectionSettings & {
  kind: "course";
  anchor: string;
  label: string;
  title: PrintTitleSegment[];
  plainTitle: string;
  deck: string | null;
  lessons: PrintCourseLesson[];
  /** The course page on the site, which lists every meeting. */
  sitePath: string;
};

export type PrintSection = PrintArticleSection | PrintMapSection | PrintCourseSection;

/** Pages that a course and a cut article may fill, before the QR invite. */
export const PRINT_FIT_PAGES = 2;

export type PrintCoverHighlight = {
  anchor: string;
  label: string;
  title: string;
  excerpt: string | null;
};

export type PrintCover = {
  meta: string;
  title: PrintTitleSegment[];
  deck: string | null;
  image: (PrintImage & { bleed: boolean }) | null;
  highlights: PrintCoverHighlight[];
};

export type PrintIssueDocument = {
  variant: IssueHomeVariant;
  /** Umami campaign of the QR codes, e.g. "numero-zero". */
  campaign: string;
  cover: PrintCover;
  sections: PrintSection[];
};

const COVER_HIGHLIGHTS_LIMIT = 3;

function toTitleSegments(styled: IssueTitleStyled | null, fallback: string): PrintTitleSegment[] {
  if (!styled?.length) return [{ text: fallback, accent: false, breakAfter: false }];

  return styled.map((segment, index) => ({
    text: index > 0 && styled[index - 1]?.breakAfter ? segment.text.trimStart() : segment.text,
    accent: segment.tone === "primary",
    breakAfter: segment.breakAfter ?? false,
  }));
}

function formatIssueDate(value: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString("it-IT", { month: "long", year: "numeric", timeZone: "UTC" });
}

function buildCoverMeta(issue: PrintIssueSource, issueNumber: string) {
  return [
    issue.printSettings.showIssueNumber ? issueNumber : null,
    formatIssueDate(issue.publishedAt),
  ]
    .filter(Boolean)
    .join(" · ");
}

function toPrintImage(url: string | null, alt: string | null, fallbackAlt: string) {
  return url ? { url, alt: alt || fallbackAlt } : null;
}

function resolveSectionSettings(
  settings: { stopWithSiteCta?: boolean; showInIssueIntro?: boolean } | undefined,
): PrintSectionSettings {
  return {
    stopWithSiteCta: settings?.stopWithSiteCta ?? false,
    showInIssueIntro: settings?.showInIssueIntro ?? false,
  };
}

function toPrintArticleSection(
  article: PrintArticleSource,
  role: PrintArticleRole,
  settings: PrintSectionSettings & { layout: IssueHomeArticlePrintLayout },
  variant: IssueHomeVariant,
): PrintArticleSection {
  const image = toPrintImage(article.imageUrl, article.imageAlt, article.title);
  const layoutFallback = settings.layout === "fullscreen" && !image;
  const { headline, subtitle } = splitPrintHeadline(
    toTitleSegments(article.titleStyled, article.title),
  );

  return {
    kind: "article",
    anchor: `print-${article.id}`,
    role,
    label: resolvePrintArticleLabel(article.categoryName, role),
    title: headline,
    subtitle,
    plainTitle: article.title,
    deck: article.excerpt ? hyphenatePrintText(article.excerpt) : null,
    author: article.authorName ?? "Redazione",
    image,
    content: hyphenatePrintRichText(article.contentRich),
    articlePath: `/articoli/${article.slug}`,
    ctaLabel: resolvePrintArticleCta(article.categoryName),
    dark: role !== "body" && Boolean(image && resolvePrintDarkTone(variant)),
    ...settings,
    layout: layoutFallback ? "default" : settings.layout,
    layoutFallback,
  };
}

function toPrintMapSection(
  blockId: string,
  map: PrintMapSource,
  settings: PrintSectionSettings,
  issueSlug: string,
): PrintMapSection {
  const items = map.items.toSorted((left, right) => left.sortOrder - right.sortOrder);
  const plate = buildPrintMapPlate(
    items.map((item) => ({ latitude: Number(item.latitude), longitude: Number(item.longitude) })),
  );
  const deck = extractPlainText(map.descriptionRich);

  return {
    kind: "map",
    anchor: `print-map-${blockId}`,
    label: "Mappatura",
    title: toTitleSegments(map.titleStyled, map.title),
    plainTitle: map.title,
    deck: deck ? hyphenatePrintText(deck) : null,
    plate,
    entries: items.map((item, index) => ({
      id: item.id,
      label: plate.markers[index]?.label ?? String(index + 1).padStart(2, "0"),
      title: item.title,
      excerpt: toPrintTextRuns(item.descriptionRich),
    })),
    directory: buildPrintMapDirectoryLayout(items.length),
    sitePath: `/uscite/${issueSlug}#${getIssueBlockAnchorId(blockId)}`,
    ...settings,
  };
}

/**
 * Lessons are generously pre-trimmed to keep the print source light: the viewer
 * trims each meeting again to fill its box on the laid-out page.
 */
const COURSE_LESSON_MAX_CHARS = 8000;

function toPrintCourseSection(
  blockId: string,
  course: PrintCourseSource,
  settings: PrintSectionSettings,
): PrintCourseSection {
  const lessons = course.lessons
    .filter((lesson) => lesson.status !== "ARCHIVED")
    .toSorted((left, right) => left.sortOrder - right.sortOrder);
  const deck = extractPlainText(course.description);

  return {
    kind: "course",
    anchor: `print-course-${blockId}`,
    label: "Contro-formazione",
    title: toTitleSegments(course.titleStyled, course.title),
    plainTitle: course.title,
    deck: deck ? hyphenatePrintText(deck) : null,
    lessons: lessons.map((lesson, index) => {
      const lead = lesson.excerptRich
        ? toPrintTextRuns(lesson.excerptRich)
        : toPrintTextRuns({
            type: "paragraph",
            content: [{ type: "text", text: lesson.excerpt ?? "" }],
          });

      return {
        id: lesson.id,
        label: String(index + 1).padStart(2, "0"),
        title: lesson.title,
        lead,
        content: hyphenatePrintRichText(
          truncatePrintRichText(lesson.contentRich, COURSE_LESSON_MAX_CHARS),
        ),
      };
    }),
    sitePath: `/contro-formazione/${course.slug}`,
    ...settings,
  };
}

/**
 * The printed sequence follows the home blocks: the special (opening, rupture,
 * closing), the body articles, the map plates and the courses. Questionnaires
 * and previews are not printed yet.
 */
export function buildPrintSections({
  issue,
  articles,
  maps,
  courses,
}: {
  issue: PrintIssueSource;
  articles: PrintArticleSource[];
  maps: PrintMapSource[];
  courses: PrintCourseSource[];
}): PrintSection[] {
  const articleById = new Map(articles.map((article) => [article.id, article]));
  const mapById = new Map(maps.map((map) => [map.id, map]));
  const courseById = new Map(courses.map((course) => [course.id, course]));

  return (issue.homeBlocks ?? []).flatMap((block): PrintSection[] => {
    if (block.type === "course") {
      const course = block.courseId ? courseById.get(block.courseId) : undefined;
      if (!course || block.printSettings?.excludeFromPrint) return [];

      return [toPrintCourseSection(block.id, course, resolveSectionSettings(block.printSettings))];
    }

    if (block.type === "map") {
      const map = block.mapId ? mapById.get(block.mapId) : undefined;
      if (!map || block.printSettings?.excludeFromPrint) return [];

      return [
        toPrintMapSection(block.id, map, resolveSectionSettings(block.printSettings), issue.slug),
      ];
    }

    if (!isArticleHomeBlock(block)) return [];

    const articleIds = isSingleArticleBlock(block.type)
      ? block.articleIds.slice(0, 1)
      : block.articleIds;

    return articleIds.flatMap((articleId) => {
      const article = articleById.get(articleId);
      const settings = block.printSettings?.[articleId];
      if (!article || settings?.excludeFromPrint) return [];

      return [
        toPrintArticleSection(
          article,
          block.type,
          { ...resolveSectionSettings(settings), layout: settings?.layout ?? "default" },
          issue.homeVariant,
        ),
      ];
    });
  });
}

function resolveCoverImage(issue: PrintIssueSource, sections: PrintSection[]) {
  const bleed = issue.printSettings.coverImageMode === "bleed";
  const configured = toPrintImage(
    issue.printSettings.coverImageUrl,
    issue.printSettings.coverImageAlt,
    issue.title,
  );
  if (configured) return { ...configured, bleed };

  const articles = sections.filter((section) => section.kind === "article");
  const fallback =
    articles.find((article) => article.role === "closing" && article.image)?.image ??
    articles.find((article) => article.role !== "body" && article.image)?.image;

  return fallback ? { ...fallback, bleed } : null;
}

export function buildPrintIssueDocument({
  issue,
  articles,
  maps,
  courses,
  issueNumber,
}: {
  issue: PrintIssueSource;
  articles: PrintArticleSource[];
  maps: PrintMapSource[];
  courses: PrintCourseSource[];
  issueNumber: string;
}): PrintIssueDocument {
  const sections = buildPrintSections({ issue, articles, maps, courses });
  const deck = extractPlainText(issue.description);

  return {
    variant: issue.homeVariant,
    campaign: buildPrintCampaign(issueNumber),
    sections,
    cover: {
      meta: buildCoverMeta(issue, issueNumber),
      title: toTitleSegments(issue.titleStyled, issue.title),
      deck: deck ? hyphenatePrintText(deck) : null,
      image: resolveCoverImage(issue, sections),
      highlights: sections
        .filter((section) => section.showInIssueIntro)
        .slice(0, COVER_HIGHLIGHTS_LIMIT)
        .map((section) => ({
          anchor: section.anchor,
          label: section.label,
          title: section.plainTitle,
          excerpt: section.deck,
        })),
    },
  };
}
