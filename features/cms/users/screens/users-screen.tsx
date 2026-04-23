import { CmsForbiddenState } from "@/components/cms/common";
import { CmsUsersListScreen } from "@/features/cms/users/screens/users-list-screen";
import { hasCmsRole, requireCmsSession } from "@/lib/cms/auth";

export async function CmsUsersScreen() {
  const session = await requireCmsSession("/cms/users");

  if (!hasCmsRole(session, "ADMIN")) {
    return <CmsForbiddenState />;
  }

  return <CmsUsersListScreen />;
}
