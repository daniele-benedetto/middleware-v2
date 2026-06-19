import { CmsAuthorsListScreen } from "@/features/cms/authors/screens/authors-list-screen";
import { parseAuthorsListSearchParams } from "@/lib/cms/query";
import { prefetchAuthorsList } from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: i18n.cms.navigation.authors,
  description: i18n.cms.lists.authors.subtitle,
  path: "/cms/authors",
});

type CmsAuthorsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CmsAuthorsPage({ searchParams }: CmsAuthorsPageProps) {
  const resolvedSearchParams = await searchParams;
  const input = parseAuthorsListSearchParams(resolvedSearchParams);
  const initialData = await prefetchAuthorsList(input);

  return <CmsAuthorsListScreen initialInput={input} initialData={initialData} />;
}
