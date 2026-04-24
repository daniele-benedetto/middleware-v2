import { CmsArticlesListScreen } from "@/features/cms/articles/screens/articles-list-screen";
import { parseArticlesListSearchParams } from "@/lib/cms/query";
import { prefetchArticlesListWithFilterOptions } from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: i18n.cms.navigation.articles,
  description: i18n.cms.lists.articles.subtitle,
  path: "/cms/articles",
});

type CmsArticlesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CmsArticlesPage({ searchParams }: CmsArticlesPageProps) {
  const resolvedSearchParams = await searchParams;
  const input = parseArticlesListSearchParams(resolvedSearchParams);
  const initialData = await prefetchArticlesListWithFilterOptions(input);

  return (
    <CmsArticlesListScreen
      initialInput={input}
      initialData={initialData.articles}
      initialIssuesOptionsData={initialData.issuesOptions}
      initialCategoriesOptionsData={initialData.categoriesOptions}
    />
  );
}
