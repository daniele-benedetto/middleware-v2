import { CmsForbiddenState } from "@/components/cms/common";
import { CmsUsersListScreen } from "@/features/cms/users/screens/users-list-screen";
import { hasCmsRole, requireCmsSession } from "@/lib/cms/auth";
import { parseUsersListSearchParams } from "@/lib/cms/query";
import { prefetchUsersList } from "@/lib/cms/trpc/server-prefetch";
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
  const session = await requireCmsSession("/cms/users");

  if (!hasCmsRole(session, "ADMIN")) {
    return <CmsForbiddenState />;
  }

  const input = parseUsersListSearchParams(resolvedSearchParams);
  const initialData = await prefetchUsersList(input);

  return (
    <CmsUsersListScreen
      initialInput={input}
      initialData={initialData}
      currentUserId={session.user.id}
    />
  );
}
