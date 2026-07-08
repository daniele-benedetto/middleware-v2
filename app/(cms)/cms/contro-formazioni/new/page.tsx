import { CmsCourseFormScreen } from "@/features/cms/courses/screens/course-form-screen";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: `${i18n.cms.resource.new} ${i18n.cms.navigation.courses}`,
  path: "/cms/contro-formazioni/new",
});

export default function CmsCourseNewPage() {
  return <CmsCourseFormScreen mode="create" />;
}
