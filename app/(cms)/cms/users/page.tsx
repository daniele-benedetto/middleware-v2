import { CmsUsersScreen } from "@/features/cms/users/screens/users-screen";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: i18n.cms.navigation.users,
  description: i18n.cms.lists.users.subtitle,
  path: "/cms/users",
});

export default async function CmsUsersPage() {
  return <CmsUsersScreen />;
}
