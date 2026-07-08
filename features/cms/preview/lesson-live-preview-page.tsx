"use client";

import { CmsPreviewToolbar } from "@/components/cms/preview/preview-toolbar";
import { PublicLessonPage } from "@/components/public/pages";
import { useLessonLivePreviewSnapshot } from "@/features/cms/preview/use-live-preview";
import { i18n } from "@/lib/i18n";

import type { LessonLivePreviewSnapshot } from "@/lib/cms/preview/live";
import type { PublicCourseLessonSummaryDto } from "@/lib/server/modules/courses/dto/public";

type LessonLivePreviewPageProps = {
  sessionId: string;
  initialSnapshot: LessonLivePreviewSnapshot;
  lessonNumber: number | null;
  otherLessons: PublicCourseLessonSummaryDto[];
  editHref: string;
  refreshHref: string;
};

export function LessonLivePreviewPage({
  sessionId,
  initialSnapshot,
  lessonNumber,
  otherLessons,
  editHref,
  refreshHref,
}: LessonLivePreviewPageProps) {
  const text = i18n.cms.preview;
  const { snapshot, isLive } = useLessonLivePreviewSnapshot(sessionId, initialSnapshot);

  return (
    <>
      <CmsPreviewToolbar
        resourceLabel={text.lessonResource}
        title={snapshot.lesson.title}
        statusLabel={
          isLive ? `${snapshot.statusLabel} · ${text.unsavedChanges}` : snapshot.statusLabel
        }
        editHref={editHref}
        refreshHref={refreshHref}
        publicHref={`/contro-formazione/${snapshot.lesson.courseSlug}/${snapshot.lesson.slug}`}
        publicAvailable={snapshot.publicAvailable}
      />
      <PublicLessonPage
        lesson={snapshot.lesson}
        lessonNumber={isLive ? null : lessonNumber}
        otherLessons={isLive ? [] : otherLessons}
      />
    </>
  );
}
