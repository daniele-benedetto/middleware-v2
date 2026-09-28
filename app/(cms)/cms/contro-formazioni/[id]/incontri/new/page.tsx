import { CmsLessonFormScreen } from "@/features/cms/lessons/screens/lesson-form-screen";
import {
  prefetchCmsDetailOrNotFound,
  resolveCmsRouteEntityIdOrNotFound,
} from "@/lib/cms/route-handling";
import {
  prefetchCourseById,
  prefetchLessonFormCourseOptions,
} from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: `${i18n.cms.resource.new} ${i18n.cms.navigation.lessons}`,
  path: "/cms/contro-formazioni/[id]/incontri/new",
});

type CmsCourseLessonNewPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CmsCourseLessonNewPage({ params }: CmsCourseLessonNewPageProps) {
  const { id: rawCourseId } = await params;
  const courseId = resolveCmsRouteEntityIdOrNotFound(rawCourseId);
  const [, initialCourseOptions] = await Promise.all([
    prefetchCmsDetailOrNotFound(() => prefetchCourseById(courseId)),
    prefetchLessonFormCourseOptions(),
  ]);

  return (
    <CmsLessonFormScreen
      mode="create"
      courseId={courseId}
      initialCourseOptions={initialCourseOptions}
    />
  );
}
