import { Skeleton } from "@/components/ui/skeleton";
import { i18n } from "@/lib/i18n";

export function CmsLoadingState() {
  return (
    <div className="space-y-3" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{i18n.cms.loading.content}</span>
      <Skeleton className="h-8 w-1/3 rounded-[6px] border border-border bg-card-hover" />
      <Skeleton className="h-16 w-full rounded-[6px] border border-border bg-card-hover" />
      <Skeleton className="h-16 w-full rounded-[6px] border border-border bg-card-hover" />
      <Skeleton className="h-16 w-full rounded-[6px] border border-border bg-card-hover" />
    </div>
  );
}
