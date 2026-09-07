import { CmsQuestionnaireResponsesScreen } from "@/features/cms/questionnaires/screens/questionnaire-responses-screen";
import {
  prefetchCmsDetailOrNotFound,
  resolveCmsRouteEntityIdOrNotFound,
} from "@/lib/cms/route-handling";
import {
  prefetchQuestionnaireById,
  prefetchQuestionnaireResponses,
} from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: `${i18n.cms.lists.questionnaires.responses.title} ${i18n.cms.navigation.questionnaires}`,
  path: "/cms/questionari/[id]/risposte",
});

export default async function CmsQuestionnaireResponsesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = resolveCmsRouteEntityIdOrNotFound((await params).id);
  const [questionnaire, initialData] = await Promise.all([
    prefetchCmsDetailOrNotFound(() => prefetchQuestionnaireById(id)),
    prefetchCmsDetailOrNotFound(() => prefetchQuestionnaireResponses(id)),
  ]);
  return (
    <CmsQuestionnaireResponsesScreen questionnaire={questionnaire} initialData={initialData} />
  );
}
