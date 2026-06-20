import { createHomeBlock } from "@/lib/issues/home-block-rules";

import type { IssueHomeBlocks } from "@/lib/server/modules/issues/schema";

export type SuggestedHomeBlockArticle = {
  id: string;
  title: string;
  isFeatured: boolean;
  position: number;
  categoryName?: string | null;
  categorySlug?: string | null;
};

const blockDescriptions = {
  constellation:
    "Dalla mobilitazione verso l’inchiesta: pratiche, paure e spazio pubblico come terreno di organizzazione politica.",
  sequence:
    "Casa, lavoro, memoria e composizione sociale: tre sguardi per leggere cosa resta fuori dal racconto dominante.",
  closing:
    "Un ultimo contributo per ricomporre trasformazioni urbane, conflitto sociale e possibilità di radicamento.",
} as const;

function normalizeCategory(value: string | null | undefined) {
  return value?.toLowerCase().trim() ?? "";
}

function hasCategory(article: SuggestedHomeBlockArticle, categoryNeedle: string) {
  return (
    normalizeCategory(article.categorySlug).includes(categoryNeedle) ||
    normalizeCategory(article.categoryName).includes(categoryNeedle)
  );
}

function sortEditorialArticles(articles: SuggestedHomeBlockArticle[]) {
  return [...articles].sort((a, b) => {
    if (a.isFeatured !== b.isFeatured) {
      return a.isFeatured ? -1 : 1;
    }

    return a.position - b.position;
  });
}

export function generateSuggestedHomeBlocks(
  articles: SuggestedHomeBlockArticle[],
): IssueHomeBlocks {
  const sortedArticles = sortEditorialArticles(articles);
  const editorials = sortedArticles.filter((article) => hasCategory(article, "editoriale"));
  const contributions = sortedArticles.filter((article) => hasCategory(article, "contribut"));
  const interviews = sortedArticles.filter((article) => hasCategory(article, "intervist"));
  const usedArticleIds = new Set<string>();
  const blocks: IssueHomeBlocks = [];

  const takeUnused = (article: SuggestedHomeBlockArticle | undefined) => {
    if (!article || usedArticleIds.has(article.id)) {
      return null;
    }

    usedArticleIds.add(article.id);
    return article;
  };

  const openingArticle = takeUnused(editorials[0] ?? sortedArticles[0]);

  if (openingArticle) {
    blocks.push(
      createHomeBlock({
        id: "apertura-editoriale",
        type: "opening",
        title: null,
        description: null,
        articleIds: [openingArticle.id],
        featuredArticleId: openingArticle.id,
      }),
    );
  }

  const createEditorialCluster = ({
    id,
    type,
    title,
    description,
    contribution,
    sectionInterviews,
  }: {
    id: string;
    type: "constellation" | "sequence";
    title: string;
    description: string;
    contribution: SuggestedHomeBlockArticle | undefined;
    sectionInterviews: SuggestedHomeBlockArticle[];
  }) => {
    const selectedContribution = takeUnused(contribution);
    const selectedInterviews = sectionInterviews
      .map((article) => takeUnused(article))
      .filter((article): article is SuggestedHomeBlockArticle => Boolean(article));
    const selectedArticles = [selectedContribution, ...selectedInterviews].filter(
      (article): article is SuggestedHomeBlockArticle => Boolean(article),
    );

    if (selectedArticles.length === 0) {
      return;
    }

    blocks.push(
      createHomeBlock({
        id,
        type,
        title,
        description,
        articleIds: selectedArticles.map((article) => article.id),
        featuredArticleId: selectedContribution?.id ?? selectedArticles[0]?.id ?? null,
      }),
    );
  };

  createEditorialCluster({
    id: "campo-del-conflitto",
    type: "constellation",
    title: "Campo del conflitto",
    description: blockDescriptions.constellation,
    contribution: contributions[0],
    sectionInterviews: interviews.slice(0, 2),
  });

  createEditorialCluster({
    id: "dentro-il-territorio",
    type: "sequence",
    title: "Dentro il territorio",
    description: blockDescriptions.sequence,
    contribution: contributions[1],
    sectionInterviews: interviews.slice(2, 4),
  });

  const closingArticle =
    takeUnused(contributions[2]) ??
    takeUnused(contributions.find((article) => !usedArticleIds.has(article.id))) ??
    takeUnused(sortedArticles.find((article) => !usedArticleIds.has(article.id)));

  if (closingArticle) {
    blocks.push(
      createHomeBlock({
        id: "chiusura",
        type: "closing",
        title: "Chiusura",
        description: blockDescriptions.closing,
        articleIds: [closingArticle.id],
        featuredArticleId: closingArticle.id,
      }),
    );
  }

  return blocks;
}
