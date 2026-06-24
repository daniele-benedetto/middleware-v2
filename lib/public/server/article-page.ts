import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { normalizeHomeBlock } from "@/lib/issues/home-block-rules";
import { type IssueNumberingBlock, buildNumberedIssueArticles } from "@/lib/public/issue-numbering";
import { extractPlainText } from "@/lib/rich-text/plain-text";
import { ApiError } from "@/lib/server/http/api-error";
import { publicArticlesService } from "@/lib/server/modules/articles/service/public";
import { publicIssuesService } from "@/lib/server/modules/issues/service/public";

import type { PublicArticleDetailDto } from "@/lib/server/modules/articles/dto/public";
import type { PublicIssueArticleSummaryDto } from "@/lib/server/modules/issues/dto/public";
import type { PublicIssueDetailDto } from "@/lib/server/modules/issues/dto/public";

export const PUBLIC_ARTICLE_PAGE_CACHE_TAG = "public-article";

export type PublicRelatedIssueArticle = {
  article: PublicIssueArticleSummaryDto;
  number: number;
};

export type PublicArticlePageData = {
  article: PublicArticleDetailDto | null;
  articleNumber: number | null;
  relatedArticles: PublicRelatedIssueArticle[];
  description?: string;
};

type NarrativeBlock = IssueNumberingBlock<PublicIssueArticleSummaryDto>;

function getArticleDescription(article: PublicArticleDetailDto | null) {
  if (!article) return undefined;
  if (article.excerpt) return article.excerpt;

  const description = extractPlainText(article.excerptRich ?? article.contentRich);
  return description || undefined;
}

async function getArticleBySlug(slug: string) {
  try {
    return await publicArticlesService.getBySlug(slug);
  } catch (error) {
    if (error instanceof ApiError && error.code === "NOT_FOUND") {
      return null;
    }

    console.error("public.getPublicArticlePageData article failed", { slug, error });
    return null;
  }
}

function resolveNarrativeBlocks(issue: PublicIssueDetailDto): NarrativeBlock[] {
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

function getContextualArticles(
  article: PublicArticleDetailDto,
  numberedArticles: PublicRelatedIssueArticle[],
) {
  const currentIndex = numberedArticles.findIndex((item) => item.article.id === article.id);

  if (currentIndex < 0) {
    return {
      articleNumber: null,
      relatedArticles: [],
    };
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

async function getIssueArticleContext(article: PublicArticleDetailDto | null) {
  if (!article) {
    return {
      articleNumber: null,
      relatedArticles: [],
    };
  }

  try {
    const issue = await publicIssuesService.getBySlug(article.issueSlug);
    return getContextualArticles(
      article,
      buildNumberedIssueArticles(issue.articles, resolveNarrativeBlocks(issue)),
    );
  } catch (error) {
    console.error("public.getPublicArticlePageData issue context failed", {
      issueSlug: article.issueSlug,
      error,
    });
    return {
      articleNumber: null,
      relatedArticles: [],
    };
  }
}

export async function getPublicArticlePageData(slug: string): Promise<PublicArticlePageData> {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_ARTICLE_PAGE_CACHE_TAG);

  const article = await getArticleBySlug(slug);
  const { articleNumber, relatedArticles } = await getIssueArticleContext(article);

  return {
    article,
    articleNumber,
    relatedArticles,
    description: getArticleDescription(article),
  };
}

export async function getPublicArticleStaticParams() {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_ARTICLE_PAGE_CACHE_TAG);

  const articles = await publicArticlesService.listPublished();
  return articles.map((article) => ({ slug: article.slug }));
}
