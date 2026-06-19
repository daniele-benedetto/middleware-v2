import type { PublicIssueArticleSummaryDto } from "@/lib/server/modules/issues/dto/public";

const EDITORIAL_SLUG_HINTS = ["editoriale", "editorial", "editoriali"];

export type HomeArticleSelection = {
  editoriale: PublicIssueArticleSummaryDto | null;
  feature: PublicIssueArticleSummaryDto | null;
  altri: PublicIssueArticleSummaryDto[];
  brevi: PublicIssueArticleSummaryDto[];
};

export function pickHomeArticles(articles: PublicIssueArticleSummaryDto[]): HomeArticleSelection {
  if (articles.length === 0) {
    return { editoriale: null, feature: null, altri: [], brevi: [] };
  }

  const remaining = [...articles];
  const editoriale = takeEditoriale(remaining);
  const feature = takeFeature(remaining);
  const altri = remaining.splice(0, 4);
  const brevi = remaining.splice(0, 3);

  return { editoriale, feature, altri, brevi };
}

function takeEditoriale(
  articles: PublicIssueArticleSummaryDto[],
): PublicIssueArticleSummaryDto | null {
  const index = articles.findIndex((article) => isEditorialSlug(article.categorySlug));
  if (index >= 0) {
    return articles.splice(index, 1)[0];
  }
  return null;
}

function takeFeature(
  articles: PublicIssueArticleSummaryDto[],
): PublicIssueArticleSummaryDto | null {
  const index = articles.findIndex((article) => article.isFeatured);
  if (index >= 0) {
    return articles.splice(index, 1)[0];
  }
  return articles.shift() ?? null;
}

function isEditorialSlug(slug: string | null): boolean {
  if (!slug) return false;
  return EDITORIAL_SLUG_HINTS.includes(slug.toLowerCase());
}
