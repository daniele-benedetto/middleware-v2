import { CmsSectionDivider } from "@/components/cms/primitives/section-divider";
import { Skeleton } from "@/components/ui/skeleton";

type CmsDashboardLoadingStateProps = {
  cards?: number;
};

export function CmsDashboardLoadingState({ cards = 5 }: CmsDashboardLoadingStateProps) {
  return (
    <div className="space-y-7">
      <div className="mb-6 pb-4">
        <Skeleton className="h-12 w-56 rounded-none border border-border bg-card-hover" />
        <CmsSectionDivider tone="strong" className="mt-4" />
      </div>

      <section className="space-y-3">
        <Skeleton className="h-3.5 w-28 rounded-none bg-card-hover" />

        <div className="grid grid-cols-(--grid-covers) gap-4">
          {Array.from({ length: cards }).map((_, index) => (
            <div
              key={`card-${index}`}
              className="space-y-3 border border-foreground bg-background px-5 py-4.5"
            >
              <Skeleton className="h-3.5 w-20 rounded-none bg-card-hover" />
              <Skeleton className="h-6 w-3/4 rounded-none bg-card-hover" />
              <Skeleton className="h-7 w-32 rounded-none border border-border bg-card-hover" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
