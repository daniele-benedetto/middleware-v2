import type {
  HomeIssueArticle,
  NarrativeHomeBlock,
} from "@/components/public/home/home-view-model";

export function blockEyebrow(block: NarrativeHomeBlock) {
  return block.title || "";
}

export function formatArticleNumber(value: number) {
  return String(value).padStart(2, "0");
}

export function getArticleNumber(articleNumbers: Map<string, number>, article: HomeIssueArticle) {
  return articleNumbers.get(article.id) ?? 1;
}
