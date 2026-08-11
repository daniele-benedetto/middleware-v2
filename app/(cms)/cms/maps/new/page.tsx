import { CmsMapCreateScreen } from "@/features/cms/maps/screens/map-create-screen";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: `${i18n.cms.resource.new} ${i18n.cms.navigation.maps}`,
  path: "/cms/maps/new",
});

export default function CmsMapNewPage() {
  return <CmsMapCreateScreen />;
}
