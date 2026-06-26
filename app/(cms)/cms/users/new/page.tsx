import { forbidden } from "next/navigation";

import { CmsUserFormScreen } from "@/features/cms/users/screens/user-form-screen";
import { hasAnyCmsRole, requireCmsSession } from "@/lib/cms/auth";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";
import { usersPolicy } from "@/lib/server/modules/users/policy";

export const metadata = buildCmsMetadata({
  title: `${i18n.cms.resource.new} ${i18n.cms.navigation.users}`,
  path: "/cms/users/new",
});

export default async function CmsUserNewPage() {
  const session = await requireCmsSession("/cms/users/new");

  if (!hasAnyCmsRole(session, usersPolicy.createAllowedRoles)) {
    forbidden();
  }

  return <CmsUserFormScreen mode="create" currentUserId={session.user.id} />;
}
