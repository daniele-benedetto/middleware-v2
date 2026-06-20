import { extractPlainText } from "@/lib/rich-text/plain-text";

import type { PublicCurrentIssueDetail } from "@/lib/public/server/current-issue-detail";
import type { PublicIssueListItem } from "@/lib/public/server/issues";

export type HomeIssueArticle = PublicCurrentIssueDetail["articles"][number];

export type HomeIssueSections = {
  editorial: HomeIssueArticle[];
  sections: HomeIssueSection[];
};

export type HomeIssueSection = {
  id: string;
  title: string;
  categorySlug: string | null;
  articles: HomeIssueArticle[];
};

export const HOME_SECTION_VISIBLE_ARTICLES_LIMIT = 10;

const HOME_GRID_PATTERNS: Record<number, number[]> = {
  1: [1],
  2: [2],
  3: [3],
  4: [4],
  5: [3, 2],
  6: [3, 3],
  7: [3, 4],
  8: [4, 4],
  9: [3, 3, 3],
  10: [5, 5],
};

const EDITORIAL_CATEGORY_SLUGS = new Set(["editoriale", "editoriali"]);
const UNCATEGORIZED_SECTION_ID = "senza-categoria";
const UNCATEGORIZED_SECTION_TITLE = "Senza categoria";

function normalizeCategory(value: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function isCategory(article: HomeIssueArticle, accepted: ReadonlySet<string>) {
  return (
    accepted.has(normalizeCategory(article.categorySlug)) ||
    accepted.has(normalizeCategory(article.categoryName))
  );
}

function getSectionId(article: HomeIssueArticle) {
  const categorySlug = normalizeCategory(article.categorySlug);
  const categoryName = normalizeCategory(article.categoryName);

  return categorySlug || categoryName.replace(/\s+/g, "-") || UNCATEGORIZED_SECTION_ID;
}

function getSectionTitle(article: HomeIssueArticle) {
  return (
    article.categoryName?.trim() || article.categorySlug?.trim() || UNCATEGORIZED_SECTION_TITLE
  );
}

export function sortHomeArticles(articles: HomeIssueArticle[]) {
  return [...articles].sort((a, b) => {
    if (a.isFeatured !== b.isFeatured) {
      return a.isFeatured ? -1 : 1;
    }

    if (a.position !== b.position) {
      return a.position - b.position;
    }

    return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
  });
}

export function getHomeGridPattern(articleCount: number) {
  if (articleCount <= 0) {
    return [];
  }

  return HOME_GRID_PATTERNS[Math.min(articleCount, HOME_SECTION_VISIBLE_ARTICLES_LIMIT)];
}

export function getHomeGridRows<T>(items: T[]) {
  const pattern = getHomeGridPattern(items.length);
  let cursor = 0;

  return pattern.map((rowSize) => {
    const row = items.slice(cursor, cursor + rowSize);
    cursor += rowSize;
    return row;
  });
}

export function buildHomeIssueSections(issue: PublicCurrentIssueDetail | null): HomeIssueSections {
  const articles = issue?.articles ?? [];
  const editorial = sortHomeArticles(
    articles.filter((article) => isCategory(article, EDITORIAL_CATEGORY_SLUGS)),
  );
  const groupedSections = new Map<string, HomeIssueSection>();

  for (const article of articles) {
    if (isCategory(article, EDITORIAL_CATEGORY_SLUGS)) {
      continue;
    }

    const id = getSectionId(article);
    const section = groupedSections.get(id);

    if (section) {
      section.articles.push(article);
      continue;
    }

    groupedSections.set(id, {
      id,
      title: getSectionTitle(article),
      categorySlug: article.categorySlug,
      articles: [article],
    });
  }

  return {
    editorial,
    sections: [...groupedSections.values()]
      .map((section) => ({ ...section, articles: sortHomeArticles(section.articles) }))
      .sort((a, b) => {
        const aPosition = Math.min(...a.articles.map((article) => article.position));
        const bPosition = Math.min(...b.articles.map((article) => article.position));

        if (aPosition !== bPosition) {
          return aPosition - bPosition;
        }

        return a.title.localeCompare(b.title, "it");
      }),
  };
}

export function getIssuePlainDescription(issue: PublicCurrentIssueDetail | PublicIssueListItem) {
  if (typeof issue.description === "string") {
    return issue.description;
  }

  return extractPlainText(issue.description);
}

export function getArchiveIssues(
  issues: PublicIssueListItem[],
  currentIssue: PublicCurrentIssueDetail | null,
) {
  return issues.filter((issue) => issue.id !== currentIssue?.id);
}

export function getIssueOrderLabel(
  issues: PublicIssueListItem[],
  currentIssue: PublicCurrentIssueDetail,
  formatter: (order: number) => string,
) {
  const oldestFirst = [...issues].sort(
    (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime(),
  );
  const index = oldestFirst.findIndex((issue) => issue.id === currentIssue.id);
  return formatter(index >= 0 ? index : 0);
}
