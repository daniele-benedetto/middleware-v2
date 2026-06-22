import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function CmsFormLoadingHeader() {
  return (
    <div className="mb-6 pb-4">
      <div className="flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-stretch">
        <Skeleton className="h-10 w-72 rounded-[8px] border border-border bg-card-hover md:h-10 lg:h-12.5" />
        <div className="flex items-center gap-3 max-sm:w-full max-sm:flex-wrap">
          <Skeleton className="h-9 w-24 rounded-[6px] border border-border bg-card-hover" />
          <Skeleton className="h-9 w-24 rounded-[6px] border border-border bg-card-hover" />
        </div>
      </div>
      <hr className="mt-4 w-full border-0 border-t-2 border-foreground" />
    </div>
  );
}

export function CmsRichTextLoading({
  height = "h-40",
  fullHeight = false,
}: {
  height?: string;
  fullHeight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[8px] border border-foreground bg-card",
        fullHeight && "flex min-h-full flex-col",
      )}
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-foreground px-2 py-1.5">
        {Array.from({ length: 9 }).map((_, index) => (
          <Skeleton
            key={`tb-${index}`}
            className="h-6 w-6 rounded-[6px] border border-border bg-card-hover"
          />
        ))}
      </div>
      <Skeleton
        className={cn("w-full rounded-[6px] bg-card-hover", fullHeight ? "flex-1" : height)}
      />
    </div>
  );
}

export function CmsFieldLoading({
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
      <Skeleton className={`mb-1.5 h-2.5 ${labelWidth} rounded-[6px] bg-card-hover`} />
      <Skeleton
        className={`${inputClassName} w-full rounded-[6px] border border-border bg-card-hover`}
      />
      {hintWidth ? (
        <Skeleton className={`mt-1.25 h-2.5 ${hintWidth} rounded-[6px] bg-card-hover`} />
      ) : null}
    </div>
  );
}

export function CmsSlugFieldLoading({ labelWidth = "w-12" }: { labelWidth?: string }) {
  return (
    <div>
      <Skeleton className={`mb-1.5 h-2.5 ${labelWidth} rounded-[6px] bg-card-hover`} />
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 flex-1 rounded-[6px] border border-border bg-card-hover" />
        <Skeleton className="h-10 w-28 rounded-[6px] border border-border bg-card-hover" />
      </div>
      <Skeleton className="mt-1.25 h-2.5 w-44 rounded-[6px] bg-card-hover" />
    </div>
  );
}

export function CmsRichTextFieldLoading({
  labelWidth = "w-20",
  height = "h-40",
  fullHeight = false,
}: {
  labelWidth?: string;
  height?: string;
  fullHeight?: boolean;
}) {
  return (
    <div className={cn(fullHeight && "flex flex-1 flex-col")}>
      <Skeleton className={`mb-1.5 h-2.5 ${labelWidth} rounded-[6px] bg-card-hover`} />
      <CmsRichTextLoading height={height} fullHeight={fullHeight} />
    </div>
  );
}

export function CmsSectionLabelLoading({ width = "w-28" }: { width?: string }) {
  return <Skeleton className={`h-3 ${width} rounded-[6px] bg-card-hover`} />;
}

export function CmsArticlePanelLoading() {
  return (
    <div className="flex h-full min-h-0 flex-col rounded-[8px] border border-foreground bg-card">
      <div className="flex shrink-0 items-center justify-between border-b border-foreground px-3 py-2">
        <Skeleton className="h-2.5 w-24 rounded-[6px] bg-card-hover" />
        <Skeleton className="h-2.5 w-6 rounded-[6px] bg-card-hover" />
      </div>
      <div className="cms-scroll min-h-0 flex-1 overflow-y-auto">
        <ul className="divide-y divide-border">
          {Array.from({ length: 8 }).map((_, index) => (
            <li
              key={index}
              className="flex items-center gap-2 px-3 py-2 odd:bg-card even:bg-card-hover"
            >
              <Skeleton className="h-4 flex-1 rounded-[6px] bg-card-hover" />
              <div className="flex w-7 min-w-7 max-w-7 items-center justify-center">
                <Skeleton className="size-3.5 rounded-[5px] bg-card-hover" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
