import { CmsSectionDivider } from "@/components/cms/primitives/section-divider";
import { Skeleton } from "@/components/ui/skeleton";

function RichTextSkeleton({ height = "h-40" }: { height?: string }) {
  return (
    <div className="border border-foreground bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-foreground px-2 py-1.5">
        {Array.from({ length: 9 }).map((_, index) => (
          <Skeleton
            key={`tb-${index}`}
            className="h-6 w-6 rounded-none border border-border bg-card-hover"
          />
        ))}
      </div>
      <Skeleton className={`${height} w-full rounded-none bg-card-hover`} />
    </div>
  );
}

function FieldSkeleton({
  hintWidth,
  inputClassName = "h-10",
  labelWidth = "w-16",
}: {
  hintWidth?: string;
  inputClassName?: string;
  labelWidth?: string;
}) {
  return (
    <div>
      <Skeleton className={`mb-1.5 h-2.5 ${labelWidth} rounded-none bg-card-hover`} />
      <Skeleton
        className={`${inputClassName} w-full rounded-none border border-border bg-card-hover`}
      />
      {hintWidth ? (
        <Skeleton className={`mt-1.25 h-2.5 ${hintWidth} rounded-none bg-card-hover`} />
      ) : null}
    </div>
  );
}

function MediaFieldSkeleton({ labelWidth = "w-16" }: { labelWidth?: string }) {
  return (
    <div>
      <Skeleton className={`mb-1.5 h-2.5 ${labelWidth} rounded-none bg-card-hover`} />
      <div className="space-y-3">
        <Skeleton className="aspect-[16/10] w-full rounded-none border border-dashed border-border bg-card-hover" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-7 w-32 rounded-none border border-border bg-card-hover" />
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ width = "w-28" }: { width?: string }) {
  return <Skeleton className={`h-3 ${width} rounded-none bg-card-hover`} />;
}

export function CmsArticleFormLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mb-6 pb-4">
        <div className="flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-stretch">
          <Skeleton className="h-10 w-72 rounded-none border border-border bg-card-hover md:h-10 lg:h-12.5" />
          <div className="flex items-center gap-3 max-sm:w-full max-sm:flex-wrap">
            <Skeleton className="h-9 w-24 rounded-none border border-border bg-card-hover" />
            <Skeleton className="h-9 w-24 rounded-none border border-border bg-card-hover" />
          </div>
        </div>
        <CmsSectionDivider tone="strong" className="mt-4" />
      </div>

      <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-h-0 min-w-0 space-y-5 overflow-y-auto pb-6 lg:pr-6">
          <FieldSkeleton labelWidth="w-12" />

          <div>
            <Skeleton className="mb-1.5 h-2.5 w-12 rounded-none bg-card-hover" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 flex-1 rounded-none border border-border bg-card-hover" />
              <Skeleton className="h-10 w-28 rounded-none border border-border bg-card-hover" />
            </div>
            <Skeleton className="mt-1.25 h-2.5 w-44 rounded-none bg-card-hover" />
          </div>

          <div>
            <Skeleton className="mb-1.5 h-2.5 w-20 rounded-none bg-card-hover" />
            <RichTextSkeleton height="h-56" />
          </div>

          <div>
            <Skeleton className="mb-1.5 h-2.5 w-20 rounded-none bg-card-hover" />
            <RichTextSkeleton height="h-28" />
          </div>
        </div>

        <div className="min-h-0 min-w-0 space-y-6 overflow-y-auto pb-6 lg:border-l lg:border-foreground lg:pl-6">
          <section className="space-y-3">
            <SectionLabel />
            <div className="space-y-4">
              <FieldSkeleton labelWidth="w-16" />
              <div className="flex items-center gap-2">
                <Skeleton className="size-4 rounded-none border border-border bg-card-hover" />
                <Skeleton className="h-3 w-20 rounded-none bg-card-hover" />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <SectionLabel />
            <div className="space-y-4">
              <FieldSkeleton labelWidth="w-16" />
              <FieldSkeleton labelWidth="w-20" />
              <FieldSkeleton labelWidth="w-16" />
            </div>
          </section>

          <section className="space-y-3">
            <SectionLabel width="w-12" />
            <div>
              <Skeleton className="mb-1.5 h-2.5 w-10 rounded-none bg-card-hover" />
              <Skeleton className="h-10 w-full rounded-none border border-border bg-card-hover" />
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton
                  key={`tag-${index}`}
                  className="h-7 w-20 rounded-none border border-border bg-card-hover"
                />
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <SectionLabel />
            <div className="space-y-4">
              <MediaFieldSkeleton labelWidth="w-20" />
              <MediaFieldSkeleton labelWidth="w-20" />
              <MediaFieldSkeleton labelWidth="w-28" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
