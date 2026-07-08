import { LessonLivePreviewPage } from "@/features/cms/preview/lesson-live-preview-page";
import {
  getLessonPreviewContext,
  getLessonStatusLabel,
} from "@/lib/cms/preview/lesson-preview-context";
import { toLessonLivePreviewSnapshot } from "@/lib/cms/preview/live";
import {
  prefetchCmsDetailOrNotFound,
  resolveCmsRouteEntityIdOrNotFound,
} from "@/lib/cms/route-handling";
import {
  prefetchCoursePreviewById,
  prefetchLessonById,
  prefetchLessonPreviewById,
} from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

import type { Metadata } from "next";

type CmsLessonPreviewPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = buildCmsMetadata({
  title: i18n.cms.forms.resources.lessons.previewMetadataTitle,
  path: "/cms/incontri/[id]/preview",
});

export default async function CmsLessonPreviewPage({ params }: CmsLessonPreviewPageProps) {
  const { id: rawId } = await params;
  const id = resolveCmsRouteEntityIdOrNotFound(rawId);
  const [lesson, cmsLesson] = await Promise.all([
    prefetchCmsDetailOrNotFound(() => prefetchLessonPreviewById(id)),
    prefetchCmsDetailOrNotFound(() => prefetchLessonById(id)),
  ]);
  const course = await prefetchCmsDetailOrNotFound(() =>
    prefetchCoursePreviewById(lesson.courseId),
  );
  const { lessonNumber, otherLessons } = getLessonPreviewContext(lesson, course);
  const isPublic = cmsLesson.status === "PUBLISHED" && Boolean(cmsLesson.publishedAt);

  return (
    <LessonLivePreviewPage
      sessionId={id}
      initialSnapshot={toLessonLivePreviewSnapshot({
        id: lesson.id,
        courseId: lesson.courseId,
        courseSlug: lesson.courseSlug,
        courseTitle: lesson.courseTitle,
        title: lesson.title,
        titleStyled: lesson.titleStyled,
        slug: lesson.slug,
        excerptRich: lesson.excerptRich,
        contentRich: lesson.contentRich,
        imageUrl: lesson.imageUrl,
        imageAlt: lesson.imageAlt,
        audioUrl: lesson.audioUrl,
        audioChunks: lesson.audioChunks,
        sortOrder: lesson.sortOrder,
        statusLabel: getLessonStatusLabel(cmsLesson.status),
        publicAvailable: isPublic,
      })}
      lessonNumber={lessonNumber}
      otherLessons={otherLessons}
      editHref={`/cms/incontri/${id}/edit`}
      refreshHref={`/cms/incontri/${id}/preview`}
    />
  );
}
