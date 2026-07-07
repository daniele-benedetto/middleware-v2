import { CmsCoursesListScreen } from "@/features/cms/courses/screens/courses-list-screen";
import { parseCoursesListSearchParams } from "@/lib/cms/query";
import { prefetchCoursesList } from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: i18n.cms.navigation.courses,
  description: i18n.cms.lists.courses.subtitle,
  path: "/cms/courses",
});

type CmsCoursesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CmsCoursesPage({ searchParams }: CmsCoursesPageProps) {
  const resolvedSearchParams = await searchParams;
  const input = parseCoursesListSearchParams(resolvedSearchParams);
  const initialData = await prefetchCoursesList(input);

  return <CmsCoursesListScreen initialInput={input} initialData={initialData} />;
}
