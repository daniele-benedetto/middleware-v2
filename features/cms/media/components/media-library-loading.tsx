import { CmsSearchBar, CmsSurface } from "@/components/cms/primitives";
import { Skeleton } from "@/components/ui/skeleton";

type CmsMediaLibraryLoadingProps = {
  withToolbar?: boolean;
  tileCount?: number;
};

export function CmsMediaLibraryLoading({
  withToolbar = true,
  tileCount = 6,
}: CmsMediaLibraryLoadingProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {withToolbar ? (
        <CmsSurface spacing="md" className="space-y-3">
          <div className="flex items-center justify-between gap-3 max-sm:flex-col max-sm:items-stretch">
            <Skeleton className="h-3.5 w-44 rounded-none bg-card-hover" />
            <Skeleton className="h-10 w-32 rounded-none border border-border bg-card-hover" />
          </div>
          <div className="pointer-events-none opacity-100">
            <CmsSearchBar
              value=""
              readOnly
              className="[&_[type=search]]:pointer-events-none [&_[type=search]]:text-transparent"
            />
          </div>
        </CmsSurface>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: tileCount }).map((_, index) => (
            <Skeleton
              key={`media-loading-${index}`}
              className="aspect-[4/3] w-full rounded-none border border-foreground bg-card-hover"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
