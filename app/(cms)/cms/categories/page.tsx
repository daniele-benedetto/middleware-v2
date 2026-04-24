import { CmsCategoriesListScreen } from "@/features/cms/categories/screens/categories-list-screen";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: i18n.cms.navigation.categories,
  description: i18n.cms.lists.categories.subtitle,
  path: "/cms/categories",
});

export default function CmsCategoriesPage() {
  return <CmsCategoriesListScreen />;
}
