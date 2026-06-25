import type {
  HomeIssueArticle,
  NarrativeHomeBlock,
} from "@/components/public/home/home-view-model";

export function formatTags(article: HomeIssueArticle) {
  return article.tags
    .slice(0, 3)
    .map((tag) => tag.name)
    .join(" / ");
}

export function blockEyebrow(block: NarrativeHomeBlock, article: HomeIssueArticle) {
  return block.title || formatTags(article) || article.categoryName || "";
}

export function articleEyebrow(article: HomeIssueArticle) {
  return formatTags(article) || article.categoryName || "";
}

export function formatArticleNumber(value: number) {
  return String(value).padStart(2, "0");
}

export function getArticleNumber(articleNumbers: Map<string, number>, article: HomeIssueArticle) {
  return articleNumbers.get(article.id) ?? 1;
}
