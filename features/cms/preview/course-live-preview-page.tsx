"use client";

import { CmsPreviewToolbar } from "@/components/cms/preview/preview-toolbar";
import { PublicCoursePage } from "@/components/public/pages";
import { useCourseLivePreviewSnapshot } from "@/features/cms/preview/use-live-preview";
import { i18n } from "@/lib/i18n";

import type { CourseLivePreviewSnapshot } from "@/lib/cms/preview/live";

type CourseLivePreviewPageProps = {
  sessionId: string;
  initialSnapshot: CourseLivePreviewSnapshot;
  editHref: string;
  refreshHref: string;
};

export function CourseLivePreviewPage({
  sessionId,
  initialSnapshot,
  editHref,
  refreshHref,
}: CourseLivePreviewPageProps) {
  const text = i18n.cms.preview;
  const { snapshot, isLive } = useCourseLivePreviewSnapshot(sessionId, initialSnapshot);

  return (
    <>
      <CmsPreviewToolbar
        resourceLabel={text.courseResource}
        title={snapshot.course.title}
        statusLabel={
          isLive ? `${snapshot.statusLabel} · ${text.unsavedChanges}` : snapshot.statusLabel
        }
        editHref={editHref}
        refreshHref={refreshHref}
        publicHref={`/formazione/${snapshot.course.slug}`}
        publicAvailable={snapshot.publicAvailable}
      />
      <PublicCoursePage course={snapshot.course} />
    </>
  );
}
