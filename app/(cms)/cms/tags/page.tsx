import { CmsTagsListScreen } from "@/features/cms/tags/screens/tags-list-screen";
import { parseTagsListSearchParams } from "@/lib/cms/query";
import { prefetchTagsList } from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: i18n.cms.navigation.tags,
  description: i18n.cms.lists.tags.subtitle,
  path: "/cms/tags",
});

type CmsTagsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CmsTagsPage({ searchParams }: CmsTagsPageProps) {
  const resolvedSearchParams = await searchParams;
  const input = parseTagsListSearchParams(resolvedSearchParams);
  const initialData = await prefetchTagsList(input);

  return <CmsTagsListScreen initialData={initialData} />;
}
