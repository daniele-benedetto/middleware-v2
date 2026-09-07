import { CmsQuestionnaireFormScreen } from "@/features/cms/questionnaires/screens/questionnaire-form-screen";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: `${i18n.cms.resource.new} ${i18n.cms.navigation.questionnaires}`,
  path: "/cms/questionari/new",
});

export default function CmsQuestionnaireNewPage() {
  return <CmsQuestionnaireFormScreen mode="create" />;
}
