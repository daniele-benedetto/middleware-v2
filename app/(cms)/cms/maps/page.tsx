import { CmsMapsListScreen } from "@/features/cms/maps/screens/maps-list-screen";
import { parseMapsListSearchParams } from "@/lib/cms/query";
import { prefetchMapsList } from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: i18n.cms.navigation.maps,
  description: i18n.cms.lists.maps.subtitle,
  path: "/cms/maps",
});

type CmsMapsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CmsMapsPage({ searchParams }: CmsMapsPageProps) {
  const input = parseMapsListSearchParams(await searchParams);
  const initialData = await prefetchMapsList(input);

  return <CmsMapsListScreen initialInput={input} initialData={initialData} />;
}
