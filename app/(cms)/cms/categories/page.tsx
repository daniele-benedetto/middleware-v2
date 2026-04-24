import { CmsCategoriesListScreen } from "@/features/cms/categories/screens/categories-list-screen";
import { parseCategoriesListSearchParams } from "@/lib/cms/query";
import { prefetchCategoriesList } from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: i18n.cms.navigation.categories,
  description: i18n.cms.lists.categories.subtitle,
  path: "/cms/categories",
});

type CmsCategoriesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CmsCategoriesPage({ searchParams }: CmsCategoriesPageProps) {
  const resolvedSearchParams = await searchParams;
  const input = parseCategoriesListSearchParams(resolvedSearchParams);
  const initialData = await prefetchCategoriesList(input);

  return <CmsCategoriesListScreen initialData={initialData} />;
}
