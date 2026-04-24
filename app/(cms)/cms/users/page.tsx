import { CmsUsersScreen } from "@/features/cms/users/screens/users-screen";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: i18n.cms.navigation.users,
  description: i18n.cms.lists.users.subtitle,
  path: "/cms/users",
});

type CmsUsersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CmsUsersPage({ searchParams }: CmsUsersPageProps) {
  const resolvedSearchParams = await searchParams;

  return <CmsUsersScreen searchParams={resolvedSearchParams} />;
}
