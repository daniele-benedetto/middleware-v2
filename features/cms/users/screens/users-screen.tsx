import { CmsForbiddenState } from "@/components/cms/common";
import { CmsUsersListScreen } from "@/features/cms/users/screens/users-list-screen";
import { hasCmsRole, requireCmsSession } from "@/lib/cms/auth";
import { parseUsersListSearchParams } from "@/lib/cms/query";
import { prefetchUsersList } from "@/lib/cms/trpc/server-prefetch";

import type { CmsSearchParamsInput } from "@/lib/cms/query";

type CmsUsersScreenProps = {
  searchParams: CmsSearchParamsInput;
};

export async function CmsUsersScreen({ searchParams }: CmsUsersScreenProps) {
  const session = await requireCmsSession("/cms/users");

  if (!hasCmsRole(session, "ADMIN")) {
    return <CmsForbiddenState />;
  }

  const input = parseUsersListSearchParams(searchParams);
  const initialData = await prefetchUsersList(input);

  return <CmsUsersListScreen initialInput={input} initialData={initialData} />;
}
