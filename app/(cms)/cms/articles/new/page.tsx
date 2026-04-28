import { CmsArticleFormScreen } from "@/features/cms/articles/screens/article-form-screen";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: `${i18n.cms.resource.new} ${i18n.cms.navigation.articles}`,
  path: "/cms/articles/new",
});

export default function CmsArticleNewPage() {
  return <CmsArticleFormScreen mode="create" />;
}
