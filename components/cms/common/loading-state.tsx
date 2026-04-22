import { Skeleton } from "@/components/ui/skeleton";

export function CmsLoadingState() {
  return (
    <div className="space-y-[12px]">
      <Skeleton className="h-[32px] w-1/3 rounded-none border border-[color:var(--ink-30)] bg-[color:var(--bg-hover)]" />
      <Skeleton className="h-[64px] w-full rounded-none border border-[color:var(--ink-30)] bg-[color:var(--bg-hover)]" />
      <Skeleton className="h-[64px] w-full rounded-none border border-[color:var(--ink-30)] bg-[color:var(--bg-hover)]" />
      <Skeleton className="h-[64px] w-full rounded-none border border-[color:var(--ink-30)] bg-[color:var(--bg-hover)]" />
    </div>
  );
}
