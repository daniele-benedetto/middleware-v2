import { CmsIssuesListScreen } from "@/features/cms/issues/screens/issues-list-screen";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: i18n.cms.navigation.issues,
  description: i18n.cms.lists.issues.subtitle,
  path: "/cms/issues",
});

export default function CmsIssuesPage() {
  return <CmsIssuesListScreen />;
}
