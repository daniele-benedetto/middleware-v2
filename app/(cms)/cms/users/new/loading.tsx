import { CmsSectionDivider } from "@/components/cms/primitives/section-divider";
import { Skeleton } from "@/components/ui/skeleton";

export default function CmsUserNewLoading() {
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

      <div className="min-h-0 flex-1 overflow-y-auto pb-6 pr-1">
        <div className="space-y-4 border border-foreground p-4">
          <div>
            <Skeleton className="mb-1.5 h-2.5 w-16 rounded-none bg-card-hover" />
            <Skeleton className="h-10 w-full rounded-none border border-border bg-card-hover" />
          </div>

          <div>
            <Skeleton className="mb-1.5 h-2.5 w-16 rounded-none bg-card-hover" />
            <Skeleton className="h-10 w-full rounded-none border border-border bg-card-hover" />
          </div>

          <div>
            <Skeleton className="mb-1.5 h-2.5 w-16 rounded-none bg-card-hover" />
            <Skeleton className="h-10 w-full rounded-none border border-border bg-card-hover" />
          </div>

          <div>
            <Skeleton className="mb-1.5 h-2.5 w-24 rounded-none bg-card-hover" />
            <Skeleton className="h-10 w-full rounded-none border border-border bg-card-hover" />
            <Skeleton className="mt-1.25 h-2.5 w-32 rounded-none bg-card-hover" />
          </div>
        </div>
      </div>
    </div>
  );
}
