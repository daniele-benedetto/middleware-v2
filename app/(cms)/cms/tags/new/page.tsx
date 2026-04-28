import { CmsTagFormScreen } from "@/features/cms/tags/screens/tag-form-screen";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: `${i18n.cms.resource.new} ${i18n.cms.navigation.tags}`,
  path: "/cms/tags/new",
});

export default function CmsTagNewPage() {
  return <CmsTagFormScreen mode="create" />;
}
