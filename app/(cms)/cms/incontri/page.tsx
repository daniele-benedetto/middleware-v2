import { CmsLessonsListScreen } from "@/features/cms/lessons/screens/lessons-list-screen";
import { parseLessonsListSearchParams } from "@/lib/cms/query";
import { prefetchLessonsList } from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: i18n.cms.navigation.lessons,
  description: i18n.cms.lists.lessons.subtitle,
  path: "/cms/incontri",
});

type CmsLessonsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CmsLessonsPage({ searchParams }: CmsLessonsPageProps) {
  const resolvedSearchParams = await searchParams;
  const input = parseLessonsListSearchParams(resolvedSearchParams);
  const initialData = await prefetchLessonsList(input);

  return <CmsLessonsListScreen initialInput={input} initialData={initialData} />;
}
