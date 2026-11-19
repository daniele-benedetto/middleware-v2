import { CmsQuestionnairesListScreen } from "@/features/cms/questionnaires/screens/questionnaires-list-screen";
import { hasAnyCmsRole, requireCmsSession } from "@/lib/cms/auth";
import { parseQuestionnairesListSearchParams } from "@/lib/cms/query";
import { prefetchQuestionnairesList } from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";
import { questionnairesPolicy } from "@/lib/server/modules/questionnaires/policy";

export const metadata = buildCmsMetadata({
  title: i18n.cms.navigation.questionnaires,
  description: i18n.cms.lists.questionnaires.subtitle,
  path: "/cms/questionari",
});
type CmsQuestionnairesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
export default async function CmsQuestionnairesPage({ searchParams }: CmsQuestionnairesPageProps) {
  const input = parseQuestionnairesListSearchParams(await searchParams);
  const [session, initialData] = await Promise.all([
    requireCmsSession("/cms/questionari"),
    prefetchQuestionnairesList(input),
  ]);
  return (
    <CmsQuestionnairesListScreen
      initialInput={input}
      initialData={initialData}
      canViewResponses={hasAnyCmsRole(session, questionnairesPolicy.resultsRoles)}
    />
  );
}
