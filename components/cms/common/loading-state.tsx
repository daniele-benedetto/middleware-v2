import { Skeleton } from "@/components/ui/skeleton";

export function CmsLoadingState() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-1/3 rounded-none border border-[#0A0A0A] bg-[#E5D9C5]" />
      <Skeleton className="h-20 w-full rounded-none border border-[#0A0A0A] bg-[#E5D9C5]" />
      <Skeleton className="h-20 w-full rounded-none border border-[#0A0A0A] bg-[#E5D9C5]" />
    </div>
  );
}
