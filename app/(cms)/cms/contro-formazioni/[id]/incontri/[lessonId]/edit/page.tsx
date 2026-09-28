import { notFound } from "next/navigation";

import { CmsLessonFormScreen } from "@/features/cms/lessons/screens/lesson-form-screen";
import {
  prefetchCmsDetailOrNotFound,
  resolveCmsRouteEntityIdOrNotFound,
} from "@/lib/cms/route-handling";
import {
  prefetchCourseById,
  prefetchLessonById,
  prefetchLessonFormCourseOptions,
} from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: i18n.cms.forms.resources.lessons.editTitle,
  path: "/cms/contro-formazioni/[id]/incontri/[lessonId]/edit",
});

type CmsCourseLessonEditPageProps = {
  params: Promise<{ id: string; lessonId: string }>;
};

export default async function CmsCourseLessonEditPage({ params }: CmsCourseLessonEditPageProps) {
  const { id: rawCourseId, lessonId: rawLessonId } = await params;
  const courseId = resolveCmsRouteEntityIdOrNotFound(rawCourseId);
  const lessonId = resolveCmsRouteEntityIdOrNotFound(rawLessonId);
  const [initialCourse, initialData, initialCourseOptions] = await Promise.all([
    prefetchCmsDetailOrNotFound(() => prefetchCourseById(courseId)),
    prefetchCmsDetailOrNotFound(() => prefetchLessonById(lessonId)),
    prefetchLessonFormCourseOptions(),
  ]);

  if (
    initialData.courseId !== courseId ||
    !initialCourse.lessons.some((lesson) => lesson.id === lessonId)
  ) {
    notFound();
  }

  return (
    <CmsLessonFormScreen
      mode="edit"
      lessonId={lessonId}
      courseId={courseId}
      initialData={initialData}
      initialCourseOptions={initialCourseOptions}
    />
  );
}
