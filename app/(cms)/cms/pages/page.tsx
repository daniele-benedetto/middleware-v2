import { CmsPagesListScreen } from "@/features/cms/pages/screens/pages-list-screen";
import { parsePagesListSearchParams } from "@/lib/cms/query";
import { prefetchPagesList } from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: i18n.cms.navigation.pages,
  description: i18n.cms.lists.pages.subtitle,
  path: "/cms/pages",
});

type CmsPagesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CmsPagesPage({ searchParams }: CmsPagesPageProps) {
  const resolvedSearchParams = await searchParams;
  const input = parsePagesListSearchParams(resolvedSearchParams);
  const initialData = await prefetchPagesList(input);

  return <CmsPagesListScreen initialInput={input} initialData={initialData} />;
}
