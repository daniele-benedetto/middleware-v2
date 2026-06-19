import { CmsDataTableShell } from "@/components/cms/primitives";
import { Skeleton } from "@/components/ui/skeleton";

type CmsMediaLibraryLoadingProps = {
  withToolbar?: boolean;
  tileCount?: number;
};

export function CmsMediaLibraryLoading({
  withToolbar = true,
  tileCount = 10,
}: CmsMediaLibraryLoadingProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CmsDataTableShell
        toolbar={
          withToolbar ? (
            <div className="space-y-3">
              <Skeleton className="h-3.5 w-44 rounded-[6px] bg-card-hover" />
              <Skeleton className="h-10 rounded-[6px] border border-border bg-card-hover" />
            </div>
          ) : null
        }
        table={
          <div className="p-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {Array.from({ length: tileCount }).map((_, index) => (
                <Skeleton
                  key={`media-loading-${index}`}
                  className="aspect-4/3 w-full rounded-[8px] border border-foreground bg-card-hover"
                />
              ))}
            </div>
          </div>
        }
        pagination={
          <div className="flex items-center justify-between gap-3 max-sm:flex-col max-sm:items-stretch">
            <div className="flex flex-wrap items-center gap-1">
              <Skeleton className="h-8 w-24 rounded-[6px] border border-border bg-card-hover" />
              <Skeleton className="h-8 w-9 rounded-[6px] border border-border bg-card-hover" />
              <Skeleton className="h-8 w-9 rounded-[6px] border border-border bg-card-hover" />
              <Skeleton className="h-8 w-24 rounded-[6px] border border-border bg-card-hover" />
            </div>
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-3.5 w-18 rounded-[6px] bg-card-hover" />
              <div className="flex gap-1">
                <Skeleton className="h-7 w-9 rounded-[6px] border border-border bg-card-hover" />
                <Skeleton className="h-7 w-9 rounded-[6px] border border-border bg-card-hover" />
                <Skeleton className="h-7 w-9 rounded-[6px] border border-border bg-card-hover" />
              </div>
            </div>
          </div>
        }
      />
    </div>
  );
}
