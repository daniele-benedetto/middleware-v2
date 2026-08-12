import { CmsMapItemsListScreen } from "@/features/cms/maps/screens/map-items-list-screen";
import { parseMapItemsListSearchParams } from "@/lib/cms/query";
import { prefetchMapItemsList } from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: i18n.cms.navigation.mapItems,
  description: i18n.cms.lists.mapItems.subtitle,
  path: "/cms/map-items",
});

type CmsMapItemsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CmsMapItemsPage({ searchParams }: CmsMapItemsPageProps) {
  const input = parseMapItemsListSearchParams(await searchParams);
  const initialData = await prefetchMapItemsList(input);

  return <CmsMapItemsListScreen initialInput={input} initialData={initialData} />;
}
