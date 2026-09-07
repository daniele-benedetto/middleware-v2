import { Skeleton } from "@/components/ui/skeleton";
import {
  CmsFieldLoading,
  CmsFormLoadingHeader,
  CmsRichTextFieldLoading,
  CmsSlugFieldLoading,
} from "@/features/cms/shared/components/form-loading-primitives";

export function CmsQuestionnaireFormLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <CmsFormLoadingHeader />
      <div className="grid min-h-0 flex-1 gap-6 overflow-hidden lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:pr-1">
        <aside className="flex min-h-0 flex-col gap-3 pb-6 lg:border-r lg:border-foreground lg:pr-5">
          <div className="space-y-1">
            <Skeleton className="h-11 w-full rounded-[6px] border-l-4 border-border bg-card-hover" />
            <Skeleton className="h-11 w-full rounded-[6px] border-l-4 border-border bg-card-hover" />
          </div>
          <div className="flex min-h-0 flex-1 flex-col space-y-3 border-t border-foreground pt-4">
            <Skeleton className="h-3 w-24 rounded-[6px] bg-card-hover" />
            <div className="cms-scroll min-h-0 flex-1 space-y-1 overflow-y-auto">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className="h-11 w-full rounded-[6px] border-l-4 border-border bg-card-hover"
                />
              ))}
            </div>
            <Skeleton className="h-9 w-full rounded-[6px] border border-border bg-card-hover" />
          </div>
        </aside>
        <div className="cms-scroll min-w-0 space-y-6 overflow-y-auto pb-6">
          <div className="border-b border-foreground pb-4">
            <Skeleton className="h-3 w-24 rounded-[6px] bg-card-hover" />
            <Skeleton className="mt-2 h-8 w-80 max-w-full rounded-[6px] bg-card-hover" />
          </div>
          <CmsFieldLoading labelWidth="w-20" inputClassName="h-28" hintWidth="w-56" />
          <CmsSlugFieldLoading />
          <CmsRichTextFieldLoading labelWidth="w-24" height="h-48" />
        </div>
      </div>
    </div>
  );
}
