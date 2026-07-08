import { ArticleLivePreviewPage } from "@/features/cms/preview/article-live-preview-page";
import { toArticleLivePreviewSnapshot } from "@/lib/cms/preview/live";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

import type { Metadata } from "next";

type CmsNewArticlePreviewPageProps = {
  searchParams: Promise<{ session?: string }>;
};

const emptyContentDoc = { type: "doc", content: [{ type: "paragraph" }] };

export const metadata: Metadata = buildCmsMetadata({
  title: i18n.cms.forms.resources.articles.newPreviewMetadataTitle,
  path: "/cms/articles/new/preview",
});

export default async function CmsNewArticlePreviewPage({
  searchParams,
}: CmsNewArticlePreviewPageProps) {
  const { session } = await searchParams;
  const sessionId = session || "new";

  return (
    <ArticleLivePreviewPage
      sessionId={sessionId}
      initialSnapshot={toArticleLivePreviewSnapshot({
        issueId: "",
        issueSlug: "anteprima-uscita",
        issueTitle: i18n.cms.forms.resources.articles.previewIssueTitle,
        categoryId: "",
        categoryName: i18n.cms.forms.resources.articles.previewCategoryName,
        authorId: null,
        authorName: null,
        title: i18n.cms.forms.resources.articles.untitledPreviewTitle,
        titleStyled: null,
        slug: "anteprima-articolo",
        excerptRich: emptyContentDoc,
        contentRich: emptyContentDoc,
        imageUrl: null,
        imageAlt: null,
        audioUrl: null,
        audioChunks: null,
        statusLabel: i18n.cms.forms.resources.articles.newPreviewStatus,
        publicAvailable: false,
      })}
      articleNumber={null}
      relatedArticles={[]}
      editHref="/cms/articles/new"
      refreshHref={`/cms/articles/new/preview?session=${encodeURIComponent(sessionId)}`}
    />
  );
}
