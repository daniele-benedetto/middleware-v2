"use client";

import { CmsPreviewToolbar } from "@/components/cms/preview/preview-toolbar";
import { PublicArticlePage } from "@/components/public/pages";
import { useArticleLivePreviewSnapshot } from "@/features/cms/preview/use-live-preview";
import { i18n } from "@/lib/i18n";

import type { ArticleLivePreviewSnapshot } from "@/lib/cms/preview/live";
import type { PublicIssueArticleSummaryDto } from "@/lib/server/modules/issues/dto/public";

type PublicRelatedIssueArticle = {
  article: PublicIssueArticleSummaryDto;
  number: number;
};

type ArticleLivePreviewPageProps = {
  sessionId: string;
  initialSnapshot: ArticleLivePreviewSnapshot;
  articleNumber: number | null;
  relatedArticles: PublicRelatedIssueArticle[];
  editHref: string;
  refreshHref: string;
};

export function ArticleLivePreviewPage({
  sessionId,
  initialSnapshot,
  articleNumber,
  relatedArticles,
  editHref,
  refreshHref,
}: ArticleLivePreviewPageProps) {
  const text = i18n.cms.preview;
  const { snapshot, isLive } = useArticleLivePreviewSnapshot(sessionId, initialSnapshot);

  return (
    <>
      <CmsPreviewToolbar
        resourceLabel={text.articleResource}
        title={snapshot.article.title}
        statusLabel={
          isLive ? `${snapshot.statusLabel} · ${text.unsavedChanges}` : snapshot.statusLabel
        }
        editHref={editHref}
        refreshHref={refreshHref}
        publicHref={`/articoli/${snapshot.article.slug}`}
        publicAvailable={snapshot.publicAvailable}
      />
      <PublicArticlePage
        article={snapshot.article}
        articleNumber={articleNumber}
        relatedArticles={isLive ? [] : relatedArticles}
      />
    </>
  );
}
