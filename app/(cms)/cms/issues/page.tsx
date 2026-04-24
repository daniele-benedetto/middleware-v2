import { CmsIssuesListScreen } from "@/features/cms/issues/screens/issues-list-screen";
import { parseIssuesListSearchParams } from "@/lib/cms/query";
import { prefetchIssuesList } from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: i18n.cms.navigation.issues,
  description: i18n.cms.lists.issues.subtitle,
  path: "/cms/issues",
});

type CmsIssuesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CmsIssuesPage({ searchParams }: CmsIssuesPageProps) {
  const resolvedSearchParams = await searchParams;
  const input = parseIssuesListSearchParams(resolvedSearchParams);
  const initialData = await prefetchIssuesList(input);

  return <CmsIssuesListScreen initialInput={input} initialData={initialData} />;
}
