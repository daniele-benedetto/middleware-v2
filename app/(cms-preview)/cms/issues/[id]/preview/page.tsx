import { CmsPreviewToolbar } from "@/components/cms/preview/preview-toolbar";
import { PublicIssuePage } from "@/components/public/pages";
import {
  prefetchCmsDetailOrNotFound,
  resolveCmsRouteEntityIdOrNotFound,
} from "@/lib/cms/route-handling";
import { prefetchIssueById, prefetchIssuePreviewById } from "@/lib/cms/trpc/server-prefetch";
import { getPublicPublishedIssues } from "@/lib/public/server/issues";
import { buildCmsMetadata } from "@/lib/seo";

import type { PublicIssueListItem } from "@/lib/public/types/issues";
import type { Metadata } from "next";

type CmsIssuePreviewPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = buildCmsMetadata({
  title: "Anteprima uscita",
  path: "/cms/issues/[id]/preview",
});

function getIssueStatusLabel(issue: Awaited<ReturnType<typeof prefetchIssueById>>) {
  const activeLabel = issue.isActive ? "Attiva" : "Non attiva";
  const publicationLabel = issue.publishedAt ? "Pubblicata" : "Non pubblicata";

  return `${activeLabel} · ${publicationLabel}`;
}

export default async function CmsIssuePreviewPage({ params }: CmsIssuePreviewPageProps) {
  const { id: rawId } = await params;
  const id = resolveCmsRouteEntityIdOrNotFound(rawId);
  const [issue, cmsIssue, publishedIssues] = await Promise.all([
    prefetchCmsDetailOrNotFound(() => prefetchIssuePreviewById(id)),
    prefetchCmsDetailOrNotFound(() => prefetchIssueById(id)),
    getPublicPublishedIssues("cms.issuePreview"),
  ]);
  const publishedIssuesWithPreview = [
    issue,
    ...publishedIssues.filter((item) => item.id !== issue.id),
  ] as PublicIssueListItem[];
  const isPublic = cmsIssue.isActive && Boolean(cmsIssue.publishedAt);

  return (
    <>
      <CmsPreviewToolbar
        resourceLabel="Uscita"
        title={issue.title}
        statusLabel={getIssueStatusLabel(cmsIssue)}
        editHref={`/cms/issues/${id}/edit`}
        refreshHref={`/cms/issues/${id}/preview`}
        publicHref={`/uscite/${issue.slug}`}
        publicAvailable={isPublic}
      />
      <PublicIssuePage issue={issue} publishedIssues={publishedIssuesWithPreview} />
    </>
  );
}
