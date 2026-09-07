import { CmsQuestionnaireFormScreen } from "@/features/cms/questionnaires/screens/questionnaire-form-screen";
import {
  prefetchCmsDetailOrNotFound,
  resolveCmsRouteEntityIdOrNotFound,
} from "@/lib/cms/route-handling";
import { prefetchQuestionnaireById } from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: `${i18n.cms.quickActions.edit} ${i18n.cms.navigation.questionnaires}`,
  path: "/cms/questionari/[id]/edit",
});
export default async function CmsQuestionnaireEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = resolveCmsRouteEntityIdOrNotFound((await params).id);
  const initialData = await prefetchCmsDetailOrNotFound(() => prefetchQuestionnaireById(id));
  return <CmsQuestionnaireFormScreen mode="edit" questionnaireId={id} initialData={initialData} />;
}
