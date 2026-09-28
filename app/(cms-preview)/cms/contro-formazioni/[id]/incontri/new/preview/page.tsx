import { LessonLivePreviewPage } from "@/features/cms/preview/lesson-live-preview-page";
import { toLessonLivePreviewSnapshot } from "@/lib/cms/preview/live";
import {
  prefetchCmsDetailOrNotFound,
  resolveCmsRouteEntityIdOrNotFound,
} from "@/lib/cms/route-handling";
import { prefetchCoursePreviewById } from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

import type { Metadata } from "next";

type CmsNewCourseLessonPreviewPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session?: string }>;
};

const emptyContentDoc = { type: "doc", content: [{ type: "paragraph" }] };

export const metadata: Metadata = buildCmsMetadata({
  title: i18n.cms.forms.resources.lessons.newPreviewMetadataTitle,
  path: "/cms/contro-formazioni/[id]/incontri/new/preview",
});

export default async function CmsNewCourseLessonPreviewPage({
  params,
  searchParams,
}: CmsNewCourseLessonPreviewPageProps) {
  const { id: rawCourseId } = await params;
  const courseId = resolveCmsRouteEntityIdOrNotFound(rawCourseId);
  const { session } = await searchParams;
  const sessionId = session || "new";
  const course = await prefetchCmsDetailOrNotFound(() => prefetchCoursePreviewById(courseId));

  return (
    <LessonLivePreviewPage
      sessionId={sessionId}
      initialSnapshot={toLessonLivePreviewSnapshot({
        courseId,
        courseSlug: course.slug,
        courseTitle: course.title,
        title: i18n.cms.forms.resources.lessons.untitledPreviewTitle,
        titleStyled: null,
        slug: "anteprima-incontro",
        excerptRich: emptyContentDoc,
        contentRich: emptyContentDoc,
        imageUrl: null,
        imageAlt: null,
        audioUrl: null,
        audioChunks: null,
        sortOrder: course.lessons.length,
        statusLabel: i18n.cms.forms.resources.lessons.newPreviewStatus,
        publicAvailable: false,
      })}
      lessonNumber={null}
      otherLessons={[]}
      editHref={`/cms/contro-formazioni/${courseId}/incontri/new`}
      refreshHref={`/cms/contro-formazioni/${courseId}/incontri/new/preview?session=${encodeURIComponent(sessionId)}`}
    />
  );
}
