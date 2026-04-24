import { Skeleton } from "@/components/ui/skeleton";

type CmsPageLoadingStateProps = {
  compact?: boolean;
};

export function CmsPageLoadingState({ compact = false }: CmsPageLoadingStateProps) {
  return (
    <div className="space-y-6">
      <div className="mb-6 pb-4">
        <div className="space-y-2">
          <Skeleton className="h-10 w-56 rounded-none border border-border bg-card-hover" />
          <Skeleton className="h-5 w-full max-w-130 rounded-none border border-border bg-card-hover" />
        </div>
        <Skeleton className="mt-4 h-0.5 w-full rounded-none border-0 bg-foreground" />
      </div>

      <div className="border border-foreground bg-background">
        <div className="space-y-3 border-b border-foreground px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-8 w-28 rounded-none border border-border bg-card-hover" />
            <Skeleton className="h-8 w-28 rounded-none border border-border bg-card-hover" />
            {!compact ? (
              <Skeleton className="h-8 w-28 rounded-none border border-border bg-card-hover" />
            ) : null}
          </div>
          <div className="grid gap-3 lg:grid-cols-4">
            <Skeleton className="h-10 rounded-none border border-border bg-card-hover" />
            <Skeleton className="h-10 rounded-none border border-border bg-card-hover" />
            <Skeleton className="h-10 rounded-none border border-border bg-card-hover" />
            <Skeleton className="h-10 rounded-none border border-border bg-card-hover" />
          </div>
        </div>

        <div className="overflow-hidden border-b border-foreground">
          <div className="h-10 w-full bg-foreground" />
          <div className="space-y-0">
            {Array.from({ length: compact ? 5 : 8 }).map((_, index) => (
              <div
                key={`row-${index}`}
                className="grid grid-cols-4 gap-3 border-b border-border px-3.5 py-3 last:border-b-0"
              >
                <Skeleton className="h-4 rounded-none bg-card-hover" />
                <Skeleton className="h-4 rounded-none bg-card-hover" />
                <Skeleton className="h-4 rounded-none bg-card-hover" />
                <Skeleton className="h-4 rounded-none bg-card-hover" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-3 max-sm:flex-col max-sm:items-stretch">
          <Skeleton className="h-9 w-60 rounded-none border border-border bg-card-hover" />
          <Skeleton className="h-8 w-40 rounded-none border border-border bg-card-hover" />
        </div>
      </div>
    </div>
  );
}
