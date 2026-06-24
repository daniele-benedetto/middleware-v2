import {
  type HomeIssueArticle,
  type NarrativeHomeBlock,
} from "@/components/public/home/home-view-model";
import {
  assignIssueArticleNumbers,
  getIssueBlockNumberingArticles,
  getIssueContentArticleNumbers,
  getUnpaginatedIssueArticles,
  sortIssueNumberingFallbackArticles,
} from "@/lib/public/issue-numbering";

import type { PublicCurrentIssueDetail } from "@/lib/public/types/issues";

export function sortUnpaginatedArticles(articles: HomeIssueArticle[]) {
  return sortIssueNumberingFallbackArticles(articles);
}

export function getArticleNumbers(blocks: NarrativeHomeBlock[]) {
  return getIssueContentArticleNumbers(blocks);
}

export function assignArticleNumbers(numbers: Map<string, number>, articles: HomeIssueArticle[]) {
  assignIssueArticleNumbers(numbers, articles);
}

export function getUnpaginatedArticles(
  issue: PublicCurrentIssueDetail,
  blocks: NarrativeHomeBlock[],
) {
  return getUnpaginatedIssueArticles(issue.articles, blocks);
}

export { getIssueBlockNumberingArticles as getBlockNumberingArticles };
