import {
  type HomeIssueArticle,
  type NarrativeHomeBlock,
} from "@/components/public/home/home-view-model";

import type { PublicCurrentIssueDetail } from "@/lib/public/server/current-issue-detail";

export function sortUnpaginatedArticles(articles: HomeIssueArticle[]) {
  return [...articles].sort((a, b) => {
    if (a.isFeatured !== b.isFeatured) {
      return a.isFeatured ? -1 : 1;
    }

    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });
}

export function getArticleNumbers(blocks: NarrativeHomeBlock[]) {
  const numbers = new Map<string, number>();

  assignArticleNumbers(numbers, blocks.flatMap(getBlockNumberingArticles));

  return numbers;
}

export function assignArticleNumbers(numbers: Map<string, number>, articles: HomeIssueArticle[]) {
  for (const article of articles) {
    if (!numbers.has(article.id)) {
      numbers.set(article.id, numbers.size + 1);
    }
  }
}

export function getUnpaginatedArticles(
  issue: PublicCurrentIssueDetail,
  blocks: NarrativeHomeBlock[],
) {
  const paginatedArticleIds = new Set(
    blocks.flatMap((block) => block.articles.map((article) => article.id)),
  );

  return issue.articles.filter((article) => !paginatedArticleIds.has(article.id));
}

function getBlockNumberingArticles(block: NarrativeHomeBlock) {
  if (block.type !== "body" || block.featuredPlacement !== "right" || !block.featuredArticle) {
    return block.articles;
  }

  return [
    ...block.articles.filter((article) => article.id !== block.featuredArticle?.id),
    block.featuredArticle,
  ];
}
