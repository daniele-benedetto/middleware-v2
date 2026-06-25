"use client";

import { CmsPreviewToolbar } from "@/components/cms/preview/preview-toolbar";
import { PublicIssuePage } from "@/components/public/pages";
import { useIssueLivePreviewSnapshot } from "@/features/cms/preview/use-live-preview";
import { i18n } from "@/lib/i18n";

import type { IssueLivePreviewSnapshot } from "@/lib/cms/preview/live";
import type { PublicIssueListItem } from "@/lib/public/types/issues";

type IssueLivePreviewPageProps = {
  sessionId: string;
  initialSnapshot: IssueLivePreviewSnapshot;
  publishedIssues: PublicIssueListItem[];
  editHref: string;
  refreshHref: string;
};

export function IssueLivePreviewPage({
  sessionId,
  initialSnapshot,
  publishedIssues,
  editHref,
  refreshHref,
}: IssueLivePreviewPageProps) {
  const text = i18n.cms.preview;
  const { snapshot, isLive } = useIssueLivePreviewSnapshot(sessionId, initialSnapshot);
  const publishedIssuesWithPreview = [
    snapshot.issue,
    ...publishedIssues.filter((item) => item.id !== snapshot.issue.id),
  ] as PublicIssueListItem[];

  return (
    <>
      <CmsPreviewToolbar
        resourceLabel={text.issueResource}
        title={snapshot.issue.title}
        statusLabel={
          isLive ? `${snapshot.statusLabel} · ${text.unsavedChanges}` : snapshot.statusLabel
        }
        editHref={editHref}
        refreshHref={refreshHref}
        publicHref={`/uscite/${snapshot.issue.slug}`}
        publicAvailable={snapshot.publicAvailable}
      />
      <PublicIssuePage issue={snapshot.issue} publishedIssues={publishedIssuesWithPreview} />
    </>
  );
}
