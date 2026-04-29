import { CmsSectionDivider } from "@/components/cms/primitives/section-divider";
import { Skeleton } from "@/components/ui/skeleton";

export default function CmsUserEditLoading() {
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

      <div className="grid min-h-0 flex-1 gap-6 overflow-hidden lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-h-0 overflow-y-auto pb-6 pr-1">
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
              <Skeleton className="mt-1.25 h-2.5 w-52 rounded-none bg-card-hover" />
            </div>
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto pb-6 pl-1">
          <div className="flex h-full min-h-0 flex-col border border-foreground bg-white">
            <div className="flex shrink-0 items-center justify-between border-b border-foreground px-3 py-2">
              <Skeleton className="h-2.5 w-24 rounded-none bg-card-hover" />
              <Skeleton className="h-2.5 w-6 rounded-none bg-card-hover" />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ul className="divide-y divide-border">
                {Array.from({ length: 8 }).map((_, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 px-3 py-2 odd:bg-white even:bg-card-hover"
                  >
                    <Skeleton className="h-4 flex-1 rounded-none bg-card-hover" />
                    <Skeleton className="size-3.5 rounded-none bg-card-hover" />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
