import { extractPlainText } from "@/lib/rich-text/plain-text";

import type { PublicCurrentIssueDetail } from "@/lib/public/server/current-issue-detail";
import type { PublicIssueListItem } from "@/lib/public/server/issues";

export type HomeIssueArticle = PublicCurrentIssueDetail["articles"][number];

export type NarrativeHomeBlock = {
  id: string;
  type: "opening" | "constellation" | "rupture" | "sequence" | "closing";
  title: string | null;
  description: string | null;
  articles: HomeIssueArticle[];
  featuredArticle: HomeIssueArticle | null;
};

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

function sortByPosition(articles: HomeIssueArticle[]) {
  return [...articles].sort((a, b) => {
    if (a.position !== b.position) {
      return a.position - b.position;
    }

    return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
  });
}

function compactText(value: string | null | undefined) {
  const text = value?.trim();
  return text || null;
}

function composeConfiguredBlocks(issue: PublicCurrentIssueDetail): NarrativeHomeBlock[] {
  const articlesById = new Map(issue.articles.map((article) => [article.id, article]));
  const blocks: NarrativeHomeBlock[] = [];

  for (const block of issue.homeBlocks ?? []) {
    const articles = block.articleIds
      .map((articleId) => articlesById.get(articleId))
      .filter((article): article is HomeIssueArticle => Boolean(article));

    const fallbackArticle = articles[0];

    if (!fallbackArticle) {
      continue;
    }

    const preferredArticle =
      (block.featuredArticleId ? articlesById.get(block.featuredArticleId) : null) ??
      articles.find((article) => article.isFeatured) ??
      fallbackArticle;

    blocks.push({
      id: block.id,
      type: block.type,
      title: compactText(block.title),
      description: compactText(block.description),
      articles,
      featuredArticle:
        preferredArticle && articles.some((article) => article.id === preferredArticle.id)
          ? preferredArticle
          : fallbackArticle,
    });
  }

  return blocks;
}

function composeFallbackBlocks(issue: PublicCurrentIssueDetail): NarrativeHomeBlock[] {
  const articles = sortByPosition(issue.articles);
  const [lead, ...rest] = articles;

  if (!lead) {
    return [];
  }

  const blocks: NarrativeHomeBlock[] = [
    {
      id: "opening",
      type: "opening",
      title: null,
      description: null,
      articles: [lead],
      featuredArticle: lead,
    },
  ];

  if (rest.length > 0) {
    blocks.push({
      id: "constellation",
      type: "constellation",
      title: null,
      description: null,
      articles: rest,
      featuredArticle: rest.find((article) => article.isFeatured) ?? rest[0],
    });
  }

  return blocks;
}

export function composeNarrativeHomeBlocks(
  issue: PublicCurrentIssueDetail | null,
): NarrativeHomeBlock[] {
  if (!issue || issue.articles.length === 0) {
    return [];
  }

  const configuredBlocks = composeConfiguredBlocks(issue);
  return configuredBlocks.length > 0 ? configuredBlocks : composeFallbackBlocks(issue);
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
