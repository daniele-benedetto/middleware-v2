import { CmsListLoadingState } from "@/components/cms/common";

export function CmsQuestionnairesListLoading() {
  return <CmsListLoadingState columns={7} filterColumns={3} />;
}

export function CmsQuestionnaireResponsesLoading() {
  return <CmsListLoadingState columns={3} hiddenButton rows={12} />;
}
