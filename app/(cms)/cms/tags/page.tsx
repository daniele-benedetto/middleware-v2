import { CmsTagsListScreen } from "@/features/cms/tags/screens/tags-list-screen";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: i18n.cms.navigation.tags,
  description: i18n.cms.lists.tags.subtitle,
  path: "/cms/tags",
});

export default function CmsTagsPage() {
  return <CmsTagsListScreen />;
}
