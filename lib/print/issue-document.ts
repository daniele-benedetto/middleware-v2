import { getIssueBlockAnchorId } from "@/lib/issues/block-anchor";
import { isArticleHomeBlock, isSingleArticleBlock } from "@/lib/issues/home-block-rules";
import {
  resolvePrintArticleCta,
  resolvePrintArticleLabel,
  splitPrintHeadline,
  type PrintArticleRole,
  type PrintTitleSegment,
} from "@/lib/print/article-presentation";
import { stripPrintBodyImages } from "@/lib/print/body-images";
import { buildPrintCampaign } from "@/lib/print/campaign";
import { printFormat } from "@/lib/print/format";
import { hyphenatePrintRichText, hyphenatePrintText } from "@/lib/print/hyphenation";
import { prependPrintLeadParagraph } from "@/lib/print/lead-paragraph";
import {
  buildPrintMapDirectoryLayout,
  type PrintMapDirectoryLayout,
} from "@/lib/print/map-directory";
import { buildPrintMapPlate, type PrintMapPlate } from "@/lib/print/map-plate";
import { toPrintNotes } from "@/lib/print/notes";
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

/** The issue chosen in the preview block, with its lead article (as on the site). */
export type PrintPreviewIssueSource = {
  id: string;
  homeVariant: IssueHomeVariant;
  article: Pick<
    PrintArticleSource,
    "slug" | "title" | "titleStyled" | "excerpt" | "authorName" | "categoryName"
  >;
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

type PrintSectionSettings = {
  stopWithSiteCta: boolean;
  showInIssueIntro: boolean;
  /** The red logo across the foot of the section's last page. */
  showEndLogo: boolean;
};

export type PrintArticleSection = PrintSectionSettings & {
  kind: "article";
  anchor: string;
  role: PrintArticleRole;
  label: string;
  title: PrintTitleSegment[];
  subtitle: string | null;
  plainTitle: string;
  /**
   * The excerpt, for the cover highlights. On paper it opens `content`, or sits
   * on the opening page of a fullscreen article.
   */
  deck: string | null;
  author: string;
  image: PrintImage | null;
  content: unknown;
  /** The article text has words of its own, besides the excerpt. */
  hasText: boolean;
  articlePath: string;
  ctaLabel: string;
  /**
   * "fullscreen": the first page holds photo, title and excerpt. "halfpage":
   * photo (bleeding off the page) and title fill the top half, the text the rest.
   */
  layout: IssueHomeArticlePrintLayout;
  /** A photo layout requested without a photo: printed with the standard layout. */
  layoutFallback: Exclude<IssueHomeArticlePrintLayout, "default"> | null;
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

/** Back cover from the preview block: the lead article of the next issue. */
export type PrintBackCover = {
  issueNumber: string;
  label: string;
  title: PrintTitleSegment[];
  subtitle: string | null;
  plainTitle: string;
  deck: string | null;
  author: string;
  articlePath: string;
  /** The next issue's color, as its card on the site. */
  variant: IssueHomeVariant;
  dark: boolean;
};

export type PrintIssueDocument = {
  variant: IssueHomeVariant;
  /** Umami campaign of the QR codes, e.g. "numero-zero". */
  campaign: string;
  cover: PrintCover;
  sections: PrintSection[];
  backCover: PrintBackCover | null;
  /** A preview block is set but its issue has no published article to show. */
  backCoverUnavailable: boolean;
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
  settings:
    | { stopWithSiteCta?: boolean; showInIssueIntro?: boolean; showEndLogo?: boolean }
    | undefined,
): PrintSectionSettings {
  return {
    stopWithSiteCta: settings?.stopWithSiteCta ?? false,
    showInIssueIntro: settings?.showInIssueIntro ?? false,
    showEndLogo: settings?.showEndLogo ?? false,
  };
}

type PrintArticleSettings = PrintSectionSettings & {
  layout: IssueHomeArticlePrintLayout;
  /** Images inside the text; the opening photo is always printed. */
  showBodyImages: boolean;
};

function toPrintArticleSection(
  article: PrintArticleSource,
  role: PrintArticleRole,
  { showBodyImages, ...settings }: PrintArticleSettings,
  variant: IssueHomeVariant,
): PrintArticleSection {
  const image = toPrintImage(article.imageUrl, article.imageAlt, article.title);
  const body = toPrintNotes(
    showBodyImages ? article.contentRich : stripPrintBodyImages(article.contentRich),
  );
  const layoutFallback = settings.layout !== "default" && !image ? settings.layout : null;
  const fullscreen = settings.layout === "fullscreen" && !layoutFallback;
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
    content: hyphenatePrintRichText(
      fullscreen ? body : prependPrintLeadParagraph(body, article.excerpt),
    ),
    hasText: Boolean(extractPlainText(body)),
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
    printFormat.mapPlate,
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
    directory: buildPrintMapDirectoryLayout(items.length, printFormat.mapDirectory),
    sitePath: `/uscite/${issueSlug}#${getIssueBlockAnchorId(blockId)}`,
    ...settings,
  };
}

/**
 * Lessons are generously pre-trimmed to keep the print source light: the viewer
 * trims each meeting again to fill its box on the laid-out page. Their images
 * are left out: each meeting has a fixed box.
 */
const COURSE_LESSON_MAX_CHARS = 8000;

function toPrintCourseLesson(lesson: PrintCourseSource["lessons"][number], index: number) {
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
      truncatePrintRichText(stripPrintBodyImages(lesson.contentRich), COURSE_LESSON_MAX_CHARS),
    ),
  };
}

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
    lessons: lessons.map((lesson, index) => toPrintCourseLesson(lesson, index)),
    sitePath: `/contro-formazione/${course.slug}`,
    ...settings,
  };
}

/**
 * The printed sequence follows the home blocks: the special (opening, rupture,
 * closing), the body articles, the map plates and the courses. Questionnaires
 * are not printed; the preview becomes the back cover (`backCover`).
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
          {
            ...resolveSectionSettings(settings),
            layout: settings?.layout ?? "default",
            showBodyImages: settings?.showBodyImages ?? true,
          },
          issue.homeVariant,
        ),
      ];
    });
  });
}

function hasPrintablePreviewBlock(blocks: IssueHomeBlocks | null) {
  return (blocks ?? []).some(
    (block) =>
      block.type === "preview" &&
      Boolean(block.previewIssueId) &&
      !block.printSettings?.excludeFromPrint,
  );
}

function toPrintBackCover(source: PrintPreviewIssueSource, issueNumber: string): PrintBackCover {
  const { article } = source;
  const { headline, subtitle } = splitPrintHeadline(
    toTitleSegments(article.titleStyled, article.title),
  );

  return {
    issueNumber,
    label: resolvePrintArticleLabel(article.categoryName, "opening"),
    title: headline,
    subtitle,
    plainTitle: article.title,
    deck: article.excerpt ? hyphenatePrintText(article.excerpt) : null,
    author: article.authorName ?? "Redazione",
    articlePath: `/articoli/${article.slug}`,
    variant: source.homeVariant,
    dark: Boolean(resolvePrintDarkTone(source.homeVariant)),
  };
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
  previewIssue = null,
  previewIssueNumber = null,
}: {
  issue: PrintIssueSource;
  articles: PrintArticleSource[];
  maps: PrintMapSource[];
  courses: PrintCourseSource[];
  issueNumber: string;
  previewIssue?: PrintPreviewIssueSource | null;
  previewIssueNumber?: string | null;
}): PrintIssueDocument {
  const sections = buildPrintSections({ issue, articles, maps, courses });
  const deck = extractPlainText(issue.description);
  const backCoverRequested = hasPrintablePreviewBlock(issue.homeBlocks);
  const backCover =
    backCoverRequested && previewIssue && previewIssueNumber
      ? toPrintBackCover(previewIssue, previewIssueNumber)
      : null;

  return {
    variant: issue.homeVariant,
    campaign: buildPrintCampaign(issueNumber),
    sections,
    backCover,
    backCoverUnavailable: backCoverRequested && !backCover,
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
