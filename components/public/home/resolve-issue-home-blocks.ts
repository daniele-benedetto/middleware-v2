import { normalizeHomeBlock } from "@/lib/issues/home-block-rules";

import type {
  HomeIssueArticle,
  NarrativeHomeBlock,
} from "@/components/public/home/home-view-model";
import type { PublicCurrentIssueDetail } from "@/lib/public/server/current-issue-detail";

function compactText(value: string | null | undefined) {
  const text = value?.trim();
  return text || null;
}

function toNarrativeBlock({
  block,
  articles,
}: {
  block: NonNullable<PublicCurrentIssueDetail["homeBlocks"]>[number];
  articles: HomeIssueArticle[];
}): NarrativeHomeBlock | null {
  const fallbackArticle = articles[0];

  if (!fallbackArticle) {
    return null;
  }

  const preferredArticle =
    (block.featuredArticleId
      ? articles.find((article) => article.id === block.featuredArticleId)
      : null) ??
    articles.find((article) => article.isFeatured) ??
    fallbackArticle;

  return {
    id: block.id,
    type: block.type,
    variant: block.variant,
    title: compactText(block.title),
    titleStyled: block.titleStyled ?? null,
    description: compactText(block.description),
    articles,
    featuredArticle: preferredArticle,
    featuredPlacement: block.featuredPlacement,
  };
}

function resolveConfiguredBlocks(issue: PublicCurrentIssueDetail): NarrativeHomeBlock[] {
  const articlesById = new Map(issue.articles.map((article) => [article.id, article]));
  const manualArticleIds = new Set<string>();
  const blocks: NarrativeHomeBlock[] = [];

  for (const rawBlock of issue.homeBlocks ?? []) {
    const block = normalizeHomeBlock(rawBlock);
    const articles = block.articleIds
      .filter((articleId) => !manualArticleIds.has(articleId))
      .map((articleId) => articlesById.get(articleId))
      .filter((article): article is HomeIssueArticle => Boolean(article));

    for (const article of articles) {
      manualArticleIds.add(article.id);
    }

    const narrativeBlock = toNarrativeBlock({ block, articles });

    if (narrativeBlock) {
      blocks.push(narrativeBlock);
    }
  }

  return blocks;
}

export function resolveIssueHomeBlocks(
  issue: PublicCurrentIssueDetail | null,
): NarrativeHomeBlock[] {
  if (!issue || issue.articles.length === 0) {
    return [];
  }

  return resolveConfiguredBlocks(issue);
}
