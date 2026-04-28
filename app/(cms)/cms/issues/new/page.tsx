import { CmsIssueFormScreen } from "@/features/cms/issues/screens/issue-form-screen";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: `${i18n.cms.resource.new} ${i18n.cms.navigation.issues}`,
  path: "/cms/issues/new",
});

export default function CmsIssueNewPage() {
  return <CmsIssueFormScreen mode="create" />;
}
