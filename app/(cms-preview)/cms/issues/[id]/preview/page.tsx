import { IssueLivePreviewPage } from "@/features/cms/preview/issue-live-preview-page";
import { toIssueLivePreviewSnapshot } from "@/lib/cms/preview/live";
import {
  prefetchCmsDetailOrNotFound,
  resolveCmsRouteEntityIdOrNotFound,
} from "@/lib/cms/route-handling";
import { prefetchIssueById, prefetchIssuePreviewById } from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { getPublicPublishedIssues } from "@/lib/public/server/issues";
import { buildCmsMetadata } from "@/lib/seo";

import type { Metadata } from "next";

type CmsIssuePreviewPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = buildCmsMetadata({
  title: i18n.cms.forms.resources.issues.previewMetadataTitle,
  path: "/cms/issues/[id]/preview",
});

function getIssueStatusLabel(issue: Awaited<ReturnType<typeof prefetchIssueById>>) {
  return i18n.cms.preview.issueStatus(issue.isActive, Boolean(issue.publishedAt));
}

export default async function CmsIssuePreviewPage({ params }: CmsIssuePreviewPageProps) {
  const { id: rawId } = await params;
  const id = resolveCmsRouteEntityIdOrNotFound(rawId);
  const [issue, cmsIssue, publishedIssues] = await Promise.all([
    prefetchCmsDetailOrNotFound(() => prefetchIssuePreviewById(id)),
    prefetchCmsDetailOrNotFound(() => prefetchIssueById(id)),
    getPublicPublishedIssues("cms.issuePreview"),
  ]);
  const isPublic = cmsIssue.isActive && Boolean(cmsIssue.publishedAt);

  return (
    <IssueLivePreviewPage
      sessionId={id}
      initialSnapshot={toIssueLivePreviewSnapshot({
        id: issue.id,
        title: issue.title,
        titleStyled: issue.titleStyled,
        slug: issue.slug,
        description: issue.description,
        homeBlocks: issue.homeBlocks,
        articles: issue.articles,
        statusLabel: getIssueStatusLabel(cmsIssue),
        publicAvailable: isPublic,
      })}
      publishedIssues={publishedIssues}
      editHref={`/cms/issues/${id}/edit`}
      refreshHref={`/cms/issues/${id}/preview`}
    />
  );
}
