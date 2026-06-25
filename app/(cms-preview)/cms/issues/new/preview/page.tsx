import { IssueLivePreviewPage } from "@/features/cms/preview/issue-live-preview-page";
import { toIssueLivePreviewSnapshot } from "@/lib/cms/preview/live";
import { i18n } from "@/lib/i18n";
import { getPublicPublishedIssues } from "@/lib/public/server/issues";
import { buildCmsMetadata } from "@/lib/seo";

import type { Metadata } from "next";

type CmsNewIssuePreviewPageProps = {
  searchParams: Promise<{ session?: string }>;
};

const emptyContentDoc = { type: "doc", content: [{ type: "paragraph" }] };

export const metadata: Metadata = buildCmsMetadata({
  title: i18n.cms.forms.resources.issues.newPreviewMetadataTitle,
  path: "/cms/issues/new/preview",
});

export default async function CmsNewIssuePreviewPage({
  searchParams,
}: CmsNewIssuePreviewPageProps) {
  const [{ session }, publishedIssues] = await Promise.all([
    searchParams,
    getPublicPublishedIssues("cms.newIssuePreview"),
  ]);
  const sessionId = session || "new";

  return (
    <IssueLivePreviewPage
      sessionId={sessionId}
      initialSnapshot={toIssueLivePreviewSnapshot({
        title: i18n.cms.forms.resources.issues.untitledPreviewTitle,
        titleStyled: null,
        slug: "anteprima-uscita",
        description: emptyContentDoc,
        homeBlocks: null,
        articles: [],
        statusLabel: i18n.cms.forms.resources.issues.newPreviewStatus,
        publicAvailable: false,
      })}
      publishedIssues={publishedIssues}
      editHref="/cms/issues/new"
      refreshHref={`/cms/issues/new/preview?session=${encodeURIComponent(sessionId)}`}
    />
  );
}
