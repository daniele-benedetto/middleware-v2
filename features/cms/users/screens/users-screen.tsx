import { CmsForbiddenState } from "@/components/cms/common";
import { CmsResourcePage } from "@/components/cms/pages";
import { hasCmsRole, requireCmsSession } from "@/lib/cms/auth";
import { i18n } from "@/lib/i18n";

export async function CmsUsersScreen() {
  const session = await requireCmsSession("/cms/users");
  const text = i18n.cms;

  if (!hasCmsRole(session, "ADMIN")) {
    return <CmsForbiddenState />;
  }

  return <CmsResourcePage title={text.navigation.users} subtitle={text.resource.usersSubtitle} />;
}
