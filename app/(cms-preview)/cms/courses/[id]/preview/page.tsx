import { CourseLivePreviewPage } from "@/features/cms/preview/course-live-preview-page";
import { toCourseLivePreviewSnapshot } from "@/lib/cms/preview/live";
import {
  prefetchCmsDetailOrNotFound,
  resolveCmsRouteEntityIdOrNotFound,
} from "@/lib/cms/route-handling";
import { prefetchCourseById, prefetchCoursePreviewById } from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

import type { Metadata } from "next";

type CmsCoursePreviewPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = buildCmsMetadata({
  title: i18n.cms.forms.resources.courses.previewMetadataTitle,
  path: "/cms/courses/[id]/preview",
});

export default async function CmsCoursePreviewPage({ params }: CmsCoursePreviewPageProps) {
  const { id: rawId } = await params;
  const id = resolveCmsRouteEntityIdOrNotFound(rawId);
  const [course, cmsCourse] = await Promise.all([
    prefetchCmsDetailOrNotFound(() => prefetchCoursePreviewById(id)),
    prefetchCmsDetailOrNotFound(() => prefetchCourseById(id)),
  ]);
  const isPublic = cmsCourse.isActive && Boolean(cmsCourse.publishedAt);

  return (
    <CourseLivePreviewPage
      sessionId={id}
      initialSnapshot={toCourseLivePreviewSnapshot({
        id: course.id,
        title: course.title,
        titleStyled: course.titleStyled,
        slug: course.slug,
        description: course.description,
        homeVariant: course.homeVariant,
        lessons: course.lessons,
        statusLabel: i18n.cms.preview.courseStatus(
          cmsCourse.isActive,
          Boolean(cmsCourse.publishedAt),
        ),
        publicAvailable: isPublic,
      })}
      editHref={`/cms/courses/${id}/edit`}
      refreshHref={`/cms/courses/${id}/preview`}
    />
  );
}
