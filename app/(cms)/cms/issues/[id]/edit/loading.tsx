import { Skeleton } from "@/components/ui/skeleton";

export default function CmsIssueEditLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <Skeleton className="h-12 w-56 rounded-none border border-border bg-card-hover" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="space-y-4">
          <div className="space-y-4 border border-foreground p-4">
            <Skeleton className="h-3.5 w-28 rounded-none bg-card-hover" />
            <Skeleton className="h-10 w-full rounded-none border border-border bg-card-hover" />
            <Skeleton className="h-10 w-full rounded-none border border-border bg-card-hover" />
            <Skeleton className="h-32 w-full rounded-none border border-border bg-card-hover" />
          </div>

          <div className="space-y-4 border border-foreground p-4">
            <Skeleton className="h-3.5 w-36 rounded-none bg-card-hover" />
            <Skeleton className="h-10 w-full rounded-none border border-border bg-card-hover" />
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-10 w-full rounded-none border border-border bg-card-hover" />
              <Skeleton className="h-10 w-full rounded-none border border-border bg-card-hover" />
            </div>
          </div>
        </div>

        <div className="border border-foreground bg-white">
          <div className="flex items-center justify-between border-b border-foreground px-3 py-2">
            <Skeleton className="h-3.5 w-20 rounded-none bg-card-hover" />
            <Skeleton className="h-3.5 w-8 rounded-none bg-card-hover" />
          </div>
          <div className="space-y-2 p-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton
                key={index}
                className="h-11 w-full rounded-none border border-border bg-card-hover"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
