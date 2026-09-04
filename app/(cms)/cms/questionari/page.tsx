import { CmsQuestionnairesListScreen } from "@/features/cms/questionnaires/screens/questionnaires-list-screen";
import { parseQuestionnairesListSearchParams } from "@/lib/cms/query";
import { prefetchQuestionnairesList } from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

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
  const initialData = await prefetchQuestionnairesList(input);
  return <CmsQuestionnairesListScreen initialInput={input} initialData={initialData} />;
}
