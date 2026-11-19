import { forbidden } from "next/navigation";

import { CmsQuestionnaireResponsesScreen } from "@/features/cms/questionnaires/screens/questionnaire-responses-screen";
import { hasAnyCmsRole, requireCmsSession } from "@/lib/cms/auth";
import {
  prefetchCmsDetailOrNotFound,
  resolveCmsRouteEntityIdOrNotFound,
} from "@/lib/cms/route-handling";
import {
  prefetchQuestionnaireById,
  prefetchQuestionnaireResponses,
  prefetchQuestionnaireSummary,
} from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";
import { questionnairesPolicy } from "@/lib/server/modules/questionnaires/policy";

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
  const session = await requireCmsSession();
  // Individual responses and their summary are reserved to the results roles (ADMIN).
  if (!hasAnyCmsRole(session, questionnairesPolicy.resultsRoles)) {
    forbidden();
  }

  const [questionnaire, initialSummary, initialResponses] = await Promise.all([
    prefetchCmsDetailOrNotFound(() => prefetchQuestionnaireById(id)),
    prefetchCmsDetailOrNotFound(() => prefetchQuestionnaireSummary(id)),
    prefetchCmsDetailOrNotFound(() => prefetchQuestionnaireResponses(id)),
  ]);
  return (
    <CmsQuestionnaireResponsesScreen
      questionnaire={questionnaire}
      initialSummary={initialSummary}
      initialResponses={initialResponses}
    />
  );
}
