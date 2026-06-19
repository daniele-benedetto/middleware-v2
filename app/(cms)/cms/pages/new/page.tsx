import { CmsPageFormScreen } from "@/features/cms/pages/screens/page-form-screen";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: `${i18n.cms.resource.new} ${i18n.cms.navigation.pages}`,
  path: "/cms/pages/new",
});

export default function CmsPageNewPage() {
  return <CmsPageFormScreen mode="create" />;
}
