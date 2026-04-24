import { CmsArticlesListScreen } from "@/features/cms/articles/screens/articles-list-screen";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: i18n.cms.navigation.articles,
  description: i18n.cms.lists.articles.subtitle,
  path: "/cms/articles",
});

export default function CmsArticlesPage() {
  return <CmsArticlesListScreen />;
}
