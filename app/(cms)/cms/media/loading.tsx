import { CmsSectionDivider } from "@/components/cms/primitives";
import { Skeleton } from "@/components/ui/skeleton";
import { CmsMediaLibraryLoading } from "@/features/cms/media/components/media-library-loading";

export default function CmsMediaLoading() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-6 pb-4">
        <div className="flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-stretch">
          <Skeleton className="h-10 w-40 rounded-none border border-border bg-card-hover" />
        </div>
        <CmsSectionDivider tone="strong" className="mt-4" />
      </div>

      <CmsMediaLibraryLoading />
    </div>
  );
}
