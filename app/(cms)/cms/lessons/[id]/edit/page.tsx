import { CmsLessonFormScreen } from "@/features/cms/lessons/screens/lesson-form-screen";
import {
  prefetchCmsDetailOrNotFound,
  resolveCmsRouteEntityIdOrNotFound,
} from "@/lib/cms/route-handling";
import {
  prefetchLessonById,
  prefetchLessonFormCourseOptions,
} from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: i18n.cms.forms.resources.lessons.editTitle,
  path: "/cms/lessons/[id]/edit",
});

type CmsLessonEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CmsLessonEditPage({ params }: CmsLessonEditPageProps) {
  const { id: rawId } = await params;
  const id = resolveCmsRouteEntityIdOrNotFound(rawId);
  const [initialData, initialCourseOptions] = await Promise.all([
    prefetchCmsDetailOrNotFound(() => prefetchLessonById(id)),
    prefetchLessonFormCourseOptions(),
  ]);

  return (
    <CmsLessonFormScreen
      mode="edit"
      lessonId={id}
      initialData={initialData}
      initialCourseOptions={initialCourseOptions}
    />
  );
}
