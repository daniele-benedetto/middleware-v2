import { CmsSectionDivider } from "@/components/cms/primitives/section-divider";
import { Skeleton } from "@/components/ui/skeleton";

function RichTextSkeleton({ height = "h-40" }: { height?: string }) {
  return (
    <div className="border border-foreground bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-foreground px-2 py-1.5">
        {Array.from({ length: 9 }).map((_, index) => (
          <Skeleton
            key={`tb-${index}`}
            className="h-6 w-6 rounded-none border border-border bg-card-hover"
          />
        ))}
      </div>
      <Skeleton className={`${height} w-full rounded-none bg-card-hover`} />
    </div>
  );
}

function FieldSkeleton({ hintWidth }: { hintWidth?: string }) {
  return (
    <div>
      <Skeleton className="mb-1.5 h-2.5 w-16 rounded-none bg-card-hover" />
      <Skeleton className="h-10 w-full rounded-none border border-border bg-card-hover" />
      {hintWidth ? (
        <Skeleton className={`mt-1.25 h-2.5 ${hintWidth} rounded-none bg-card-hover`} />
      ) : null}
    </div>
  );
}

export function CmsArticleFormLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mb-6 pb-4">
        <div className="flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-stretch">
          <Skeleton className="h-10 w-72 rounded-none border border-border bg-card-hover md:h-10 lg:h-12.5" />
          <div className="flex items-center gap-3 max-sm:w-full max-sm:flex-wrap">
            <Skeleton className="h-9 w-24 rounded-none border border-border bg-card-hover" />
            <Skeleton className="h-9 w-24 rounded-none border border-border bg-card-hover" />
          </div>
        </div>
        <CmsSectionDivider tone="strong" className="mt-4" />
      </div>

      <div className="grid min-h-0 flex-1 gap-6 overflow-hidden lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-h-0 space-y-4 overflow-y-auto pb-6 pr-1">
          <section className="space-y-4 border border-foreground p-4">
            <Skeleton className="h-3 w-28 rounded-none bg-card-hover" />

            <FieldSkeleton />

            <div>
              <Skeleton className="mb-1.5 h-2.5 w-16 rounded-none bg-card-hover" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 flex-1 rounded-none border border-border bg-card-hover" />
                <Skeleton className="h-10 w-28 rounded-none border border-border bg-card-hover" />
              </div>
              <Skeleton className="mt-1.25 h-2.5 w-44 rounded-none bg-card-hover" />
            </div>
          </section>

          <section className="space-y-4 border border-foreground p-4">
            <Skeleton className="h-3 w-24 rounded-none bg-card-hover" />

            <div>
              <Skeleton className="mb-1.5 h-2.5 w-20 rounded-none bg-card-hover" />
              <RichTextSkeleton height="h-56" />
            </div>

            <div>
              <Skeleton className="mb-1.5 h-2.5 w-20 rounded-none bg-card-hover" />
              <RichTextSkeleton height="h-28" />
            </div>
          </section>

          <section className="space-y-4 border border-foreground p-4">
            <Skeleton className="h-3 w-32 rounded-none bg-card-hover" />

            <FieldSkeleton />

            <div className="flex items-center gap-2">
              <Skeleton className="size-4 rounded-none border border-border bg-card-hover" />
              <Skeleton className="h-3 w-20 rounded-none bg-card-hover" />
            </div>
          </section>
        </div>

        <div className="min-h-0 space-y-4 overflow-y-auto pb-6 pl-1">
          <section className="space-y-4 border border-foreground p-4">
            <Skeleton className="h-3 w-32 rounded-none bg-card-hover" />
            <FieldSkeleton />
            <FieldSkeleton />
            <FieldSkeleton />
          </section>

          <section className="space-y-4 border border-foreground p-4">
            <Skeleton className="h-3 w-12 rounded-none bg-card-hover" />

            <div>
              <Skeleton className="mb-1.5 h-2.5 w-10 rounded-none bg-card-hover" />
              <Skeleton className="h-10 w-full rounded-none border border-border bg-card-hover" />
            </div>

            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton
                  key={`tag-${index}`}
                  className="h-7 w-20 rounded-none border border-border bg-card-hover"
                />
              ))}
            </div>
          </section>

          <section className="space-y-4 border border-foreground p-4">
            <Skeleton className="h-3 w-32 rounded-none bg-card-hover" />
            <FieldSkeleton />
            <FieldSkeleton />

            <div>
              <Skeleton className="mb-1.5 h-2.5 w-28 rounded-none bg-card-hover" />
              <Skeleton className="h-28 w-full rounded-none border border-border bg-card-hover" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
