import { Skeleton } from "@/components/ui/skeleton";
import { CmsFormLoadingHeader } from "@/features/cms/shared/components/form-loading-primitives";

export function CmsNavigationBuilderLoading() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Caricamento builder navigazione in corso.</span>
      <CmsFormLoadingHeader />

      <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="cms-scroll min-h-0 min-w-0 space-y-4 overflow-y-auto pb-6 lg:pr-6">
          <Skeleton className="h-22 rounded-[8px] border border-border bg-card-hover" />
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="rounded-[8px] border border-foreground bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-3 w-24 rounded-[6px] bg-card-hover" />
                  <Skeleton className="h-10 w-full rounded-[6px] border border-border bg-card-hover" />
                  <Skeleton className="h-10 w-2/3 rounded-[6px] border border-border bg-card-hover" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="size-8 rounded-[6px] border border-border bg-card-hover" />
                  <Skeleton className="size-8 rounded-[6px] border border-border bg-card-hover" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="cms-scroll min-h-0 min-w-0 space-y-6 overflow-y-auto pb-6 lg:border-l lg:border-foreground lg:pl-6">
          <Skeleton className="h-42 rounded-[8px] border border-border bg-card-hover" />
          <Skeleton className="h-64 rounded-[8px] border border-border bg-card-hover" />
          <Skeleton className="h-36 rounded-[8px] border border-border bg-card-hover" />
        </div>
      </div>
    </div>
  );
}
