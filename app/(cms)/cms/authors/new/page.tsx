import { CmsAuthorFormScreen } from "@/features/cms/authors/screens/author-form-screen";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: `${i18n.cms.resource.new} ${i18n.cms.navigation.authors}`,
  path: "/cms/authors/new",
});

export default function CmsAuthorNewPage() {
  return <CmsAuthorFormScreen mode="create" />;
}
