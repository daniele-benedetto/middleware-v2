import { ArticleLivePreviewPage } from "@/features/cms/preview/article-live-preview-page";
import {
  getArticlePreviewContext,
  getArticleStatusLabel,
} from "@/lib/cms/preview/article-preview-context";
import { toArticleLivePreviewSnapshot } from "@/lib/cms/preview/live";
import {
  prefetchCmsDetailOrNotFound,
  resolveCmsRouteEntityIdOrNotFound,
} from "@/lib/cms/route-handling";
import {
  prefetchArticleById,
  prefetchArticlePreviewById,
  prefetchIssuePreviewById,
} from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

import type { Metadata } from "next";

type CmsArticlePreviewPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session?: string }>;
};

export const metadata: Metadata = buildCmsMetadata({
  title: i18n.cms.forms.resources.articles.previewMetadataTitle,
  path: "/cms/articles/[id]/preview",
});

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
    <ArticleLivePreviewPage
      sessionId={id}
      initialSnapshot={toArticleLivePreviewSnapshot({
        id: article.id,
        issueId: article.issueId,
        issueSlug: article.issueSlug,
        issueTitle: article.issueTitle,
        categoryId: article.categoryId,
        categorySlug: article.categorySlug,
        categoryName: article.categoryName,
        authorId: article.authorId,
        authorName: article.authorName,
        title: article.title,
        titleStyled: article.titleStyled,
        slug: article.slug,
        excerptRich: article.excerptRich,
        contentRich: article.contentRich,
        imageUrl: article.imageUrl,
        imageAlt: article.imageAlt,
        audioUrl: article.audioUrl,
        audioChunks: article.audioChunks,
        statusLabel: getArticleStatusLabel(cmsArticle.status),
        publicAvailable: isPublic,
      })}
      articleNumber={articleNumber}
      relatedArticles={relatedArticles}
      editHref={`/cms/articles/${id}/edit`}
      refreshHref={`/cms/articles/${id}/preview`}
    />
  );
}
