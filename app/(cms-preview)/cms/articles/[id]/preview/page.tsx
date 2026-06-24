import { CmsPreviewToolbar } from "@/components/cms/preview/preview-toolbar";
import { PublicArticlePage } from "@/components/public/pages";
import {
  prefetchCmsDetailOrNotFound,
  resolveCmsRouteEntityIdOrNotFound,
} from "@/lib/cms/route-handling";
import {
  prefetchArticleById,
  prefetchArticlePreviewById,
  prefetchIssuePreviewById,
} from "@/lib/cms/trpc/server-prefetch";
import { normalizeHomeBlock } from "@/lib/issues/home-block-rules";
import { type IssueNumberingBlock, buildNumberedIssueArticles } from "@/lib/public/issue-numbering";
import { buildCmsMetadata } from "@/lib/seo";

import type { PublicRelatedIssueArticle } from "@/lib/public/server/article-page";
import type { PublicArticleDetailDto } from "@/lib/server/modules/articles/dto/public";
import type { PublicIssueArticleSummaryDto } from "@/lib/server/modules/issues/dto/public";
import type { Metadata } from "next";

type CmsArticlePreviewPageProps = {
  params: Promise<{ id: string }>;
};

type IssuePreview = Awaited<ReturnType<typeof prefetchIssuePreviewById>>;
type NarrativeBlock = IssueNumberingBlock<PublicIssueArticleSummaryDto>;

export const metadata: Metadata = buildCmsMetadata({
  title: "Anteprima articolo",
  path: "/cms/articles/[id]/preview",
});

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

function getArticlePreviewContext(article: PublicArticleDetailDto, issue: IssuePreview) {
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

function getArticleStatusLabel(status: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
  const labels = {
    DRAFT: "Bozza",
    PUBLISHED: "Pubblicato",
    ARCHIVED: "Archiviato",
  } as const;

  return labels[status];
}

export default async function CmsArticlePreviewPage({ params }: CmsArticlePreviewPageProps) {
  const { id: rawId } = await params;
  const id = resolveCmsRouteEntityIdOrNotFound(rawId);
  const [article, cmsArticle] = await Promise.all([
    prefetchCmsDetailOrNotFound(() => prefetchArticlePreviewById(id)),
    prefetchCmsDetailOrNotFound(() => prefetchArticleById(id)),
  ]);
  const issue = await prefetchCmsDetailOrNotFound(() => prefetchIssuePreviewById(article.issueId));
  const { articleNumber, relatedArticles } = getArticlePreviewContext(article, issue);
  const isPublic = cmsArticle.status === "PUBLISHED" && Boolean(cmsArticle.publishedAt);

  return (
    <>
      <CmsPreviewToolbar
        resourceLabel="Articolo"
        title={article.title}
        statusLabel={getArticleStatusLabel(cmsArticle.status)}
        editHref={`/cms/articles/${id}/edit`}
        refreshHref={`/cms/articles/${id}/preview`}
        publicHref={`/articoli/${article.slug}`}
        publicAvailable={isPublic}
      />
      <PublicArticlePage
        article={article}
        articleNumber={articleNumber}
        relatedArticles={relatedArticles}
      />
    </>
  );
}
