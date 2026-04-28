import { CmsCategoryFormScreen } from "@/features/cms/categories/screens/category-form-screen";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: `${i18n.cms.resource.new} ${i18n.cms.navigation.categories}`,
  path: "/cms/categories/new",
});

export default function CmsCategoryNewPage() {
  return <CmsCategoryFormScreen mode="create" />;
}
