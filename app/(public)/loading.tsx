import { Skeleton } from "@/components/ui/skeleton";

export default function PublicLoading() {
  return (
    <main className="mx-auto flex w-full max-w-275 flex-1 flex-col gap-4 px-(--article-padding-x) py-10">
      <Skeleton className="h-8 w-1/3 rounded-none border border-border bg-card-hover" />
      <Skeleton className="h-64 w-full rounded-none border border-border bg-card-hover" />
      <Skeleton className="h-16 w-full rounded-none border border-border bg-card-hover" />
      <Skeleton className="h-16 w-full rounded-none border border-border bg-card-hover" />
    </main>
  );
}
