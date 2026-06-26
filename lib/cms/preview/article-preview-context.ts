import { i18n } from "@/lib/i18n";
import { normalizeHomeBlock } from "@/lib/issues/home-block-rules";
import { type IssueNumberingBlock, buildNumberedIssueArticles } from "@/lib/public/issue-numbering";

import type { PublicRelatedIssueArticle } from "@/lib/public/server/article-page";
import type { PublicArticleDetailDto } from "@/lib/server/modules/articles/dto/public";
import type { PublicIssueArticleSummaryDto } from "@/lib/server/modules/issues/dto/public";
import type { IssueHomeBlocks } from "@/lib/server/modules/issues/schema";

type IssuePreview = {
  articles: PublicIssueArticleSummaryDto[];
  homeBlocks?: IssueHomeBlocks | null;
};

type NarrativeBlock = IssueNumberingBlock<PublicIssueArticleSummaryDto>;

function resolveNarrativeBlocks(issue: IssuePreview): NarrativeBlock[] {
  const articlesById = new Map(issue.articles.map((item) => [item.id, item]));
  const manualArticleIds = new Set<string>();
  const blocks: NarrativeBlock[] = [];

  for (const rawBlock of issue.homeBlocks ?? []) {
    const block = normalizeHomeBlock(rawBlock);
    const articles = block.articleIds
      .filter((articleId) => !manualArticleIds.has(articleId))
      .map((articleId) => articlesById.get(articleId))
      .filter((item): item is PublicIssueArticleSummaryDto => Boolean(item));
    const fallbackArticle = articles[0];

    if (!fallbackArticle) {
      continue;
    }

    for (const item of articles) {
      manualArticleIds.add(item.id);
    }

    const featuredArticle =
      (block.featuredArticleId
        ? articles.find((item) => item.id === block.featuredArticleId)
        : null) ??
      articles.find((item) => item.isFeatured) ??
      fallbackArticle;

    blocks.push({
      type: block.type,
      articles,
      featuredArticle,
      featuredPlacement: block.featuredPlacement,
    });
  }

  return blocks;
}

export function getArticlePreviewContext(article: PublicArticleDetailDto, issue: IssuePreview) {
  const numberedArticles = buildNumberedIssueArticles(
    issue.articles,
    resolveNarrativeBlocks(issue),
  );
  const currentIndex = numberedArticles.findIndex((item) => item.article.id === article.id);

  if (currentIndex < 0) {
    return { articleNumber: null, relatedArticles: [] as PublicRelatedIssueArticle[] };
  }

  const windowSize = 4;
  const end = Math.min(numberedArticles.length, Math.max(currentIndex + 3, windowSize));
  const start = Math.max(0, end - windowSize);

  return {
    articleNumber: numberedArticles[currentIndex]?.number ?? null,
    relatedArticles: numberedArticles
      .slice(start, end)
      .filter((item) => item.article.id !== article.id),
  };
}

export function getArticleStatusLabel(status: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
  const labels = {
    DRAFT: i18n.cms.lists.articles.statusDraft,
    PUBLISHED: i18n.cms.lists.articles.statusPublished,
    ARCHIVED: i18n.cms.lists.articles.statusArchived,
  } as const;

  return labels[status];
}
