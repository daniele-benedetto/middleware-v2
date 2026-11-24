import { CmsListLoadingState } from "@/components/cms/common";
import { CmsSectionDivider, CmsSurface } from "@/components/cms/primitives";
import { Skeleton } from "@/components/ui/skeleton";
import { i18n } from "@/lib/i18n";

const blockClass = "rounded-[6px] bg-card-hover";
const borderedBlockClass = "rounded-[6px] border border-border bg-card-hover";

export function CmsQuestionnairesListLoading() {
  return <CmsListLoadingState columns={7} filterColumns={3} />;
}

export function QuestionnaireSummaryLoading() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-busy="true"
      aria-label={i18n.cms.lists.questionnaires.responses.summary.loading}
    >
      <CmsSurface spacing="none">
        <div className="grid divide-foreground max-lg:divide-y sm:grid-cols-2 lg:grid-cols-5 lg:divide-x">
          {Array.from({ length: 5 }).map((_, index) => (
            <div className="grid gap-2 px-5 py-4" key={index}>
              <Skeleton className={`h-3 w-24 ${blockClass}`} />
              <Skeleton className={`${index === 0 ? "h-9 w-20" : "h-5 w-28"} ${blockClass}`} />
            </div>
          ))}
        </div>
      </CmsSurface>
      <CmsSurface className="grid gap-4">
        <Skeleton className={`h-5 w-44 ${blockClass}`} />
        <Skeleton className={`h-56 w-full ${borderedBlockClass}`} />
      </CmsSurface>
      {Array.from({ length: 2 }).map((_, index) => (
        <CmsSurface className="grid gap-4" key={index}>
          <Skeleton className={`h-6 w-2/3 ${blockClass}`} />
          <div className="flex gap-8 border-y border-border py-3">
            <Skeleton className={`h-8 w-24 ${blockClass}`} />
            <Skeleton className={`h-8 w-24 ${blockClass}`} />
          </div>
          <Skeleton className={`h-48 w-full ${borderedBlockClass}`} />
        </CmsSurface>
      ))}
    </div>
  );
}

export function QuestionnaireResponsesTableLoading() {
  return (
    <CmsSurface spacing="none" className="flex min-h-0 flex-1 flex-col divide-y divide-foreground">
      <div className="space-y-3 px-5 py-4" role="status" aria-busy="true">
        <span className="sr-only">{i18n.cms.loading.content}</span>
        <Skeleton className={`h-3.5 w-32 ${blockClass}`} />
        <div className="flex gap-3">
          <Skeleton className={`h-10 w-40 ${borderedBlockClass}`} />
          <Skeleton className={`h-10 w-40 ${borderedBlockClass}`} />
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-hidden px-5 py-4">
        {Array.from({ length: 10 }).map((_, index) => (
          <Skeleton className={`h-9 w-full ${blockClass}`} key={index} />
        ))}
      </div>
    </CmsSurface>
  );
}

export function CmsQuestionnaireResponsesLoading() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-6 pb-4">
        <div className="flex items-start justify-between gap-4 max-sm:flex-col">
          <Skeleton className="h-10.5 w-56 rounded-[8px] border border-border bg-card-hover lg:h-13" />
          <div className="flex gap-2">
            <Skeleton className={`h-12 w-36 ${borderedBlockClass}`} />
            <Skeleton className={`h-12 w-52 ${borderedBlockClass}`} />
          </div>
        </div>
        <CmsSectionDivider tone="strong" className="mt-4" />
      </div>
      <div className="mb-5 flex shrink-0 gap-1 border-b border-foreground pb-2">
        <Skeleton className={`h-7 w-24 ${blockClass}`} />
        <Skeleton className={`h-7 w-24 ${blockClass}`} />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <QuestionnaireSummaryLoading />
      </div>
    </div>
  );
}
