import type { HomeIssueArticle } from "@/components/public/home/home-view-model";

export function formatArticleNumber(value: number) {
  return String(value).padStart(2, "0");
}

export function getArticleNumber(articleNumbers: Map<string, number>, article: HomeIssueArticle) {
  return articleNumbers.get(article.id) ?? 1;
}
