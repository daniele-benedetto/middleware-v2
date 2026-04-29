import { CmsSectionDivider } from "@/components/cms/primitives/section-divider";
import { Skeleton } from "@/components/ui/skeleton";

export default function CmsTagNewLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mb-6 pb-4">
        <div className="flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-stretch">
          <Skeleton className="lg:h-12.5 md:h-10 h-10 w-72 rounded-none border border-border bg-card-hover" />
          <div className="flex items-center gap-3 max-sm:w-full max-sm:flex-wrap">
            <Skeleton className="h-9 w-24 rounded-none border border-border bg-card-hover" />
            <Skeleton className="h-9 w-24 rounded-none border border-border bg-card-hover" />
          </div>
        </div>
        <CmsSectionDivider tone="strong" className="mt-4" />
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-6 pr-1">
        <section className="space-y-4 border border-foreground p-4">
          <Skeleton className="h-3 w-28 rounded-none bg-card-hover" />

          <div>
            <Skeleton className="mb-1.5 h-2.5 w-16 rounded-none bg-card-hover" />
            <Skeleton className="h-10 w-full rounded-none border border-border bg-card-hover" />
          </div>

          <div>
            <Skeleton className="mb-1.5 h-2.5 w-16 rounded-none bg-card-hover" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 flex-1 rounded-none border border-border bg-card-hover" />
              <Skeleton className="h-10 w-28 rounded-none border border-border bg-card-hover" />
            </div>
            <Skeleton className="mt-1.25 h-2.5 w-44 rounded-none bg-card-hover" />
          </div>

          <div>
            <Skeleton className="mb-1.5 h-2.5 w-24 rounded-none bg-card-hover" />
            <div className="border border-foreground bg-white">
              <div className="flex flex-wrap items-center gap-1 border-b border-foreground px-2 py-1.5">
                {Array.from({ length: 9 }).map((_, index) => (
                  <Skeleton
                    key={`tb-${index}`}
                    className="h-6 w-6 rounded-none border border-border bg-card-hover"
                  />
                ))}
              </div>
              <Skeleton className="h-40 w-full rounded-none bg-card-hover" />
            </div>
          </div>
        </section>

        <section className="space-y-4 border border-foreground p-4">
          <Skeleton className="h-3 w-24 rounded-none bg-card-hover" />

          <div className="flex items-center gap-2">
            <Skeleton className="size-4 rounded-none border border-border bg-card-hover" />
            <Skeleton className="h-3 w-24 rounded-none bg-card-hover" />
          </div>
        </section>
      </div>
    </div>
  );
}
