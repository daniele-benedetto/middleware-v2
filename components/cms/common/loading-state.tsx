import { Skeleton } from "@/components/ui/skeleton";

export function CmsLoadingState() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-1/3 rounded-none border border-border bg-card-hover" />
      <Skeleton className="h-16 w-full rounded-none border border-border bg-card-hover" />
      <Skeleton className="h-16 w-full rounded-none border border-border bg-card-hover" />
      <Skeleton className="h-16 w-full rounded-none border border-border bg-card-hover" />
    </div>
  );
}
