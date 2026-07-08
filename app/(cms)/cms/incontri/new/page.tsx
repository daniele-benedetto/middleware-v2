import { CmsLessonFormScreen } from "@/features/cms/lessons/screens/lesson-form-screen";
import { prefetchLessonFormCourseOptions } from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: `${i18n.cms.resource.new} ${i18n.cms.navigation.lessons}`,
  path: "/cms/incontri/new",
});

export default async function CmsLessonNewPage() {
  const initialCourseOptions = await prefetchLessonFormCourseOptions();

  return <CmsLessonFormScreen mode="create" initialCourseOptions={initialCourseOptions} />;
}
