import { CmsRichTextFieldLoading } from "@/features/cms/shared/components/form-loading-primitives";

export function CmsPageFormLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="h-20 animate-pulse rounded-[6px] border border-border bg-card-hover" />
      <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5 lg:pr-6">
          <div className="h-18 animate-pulse rounded-[6px] border border-border bg-card-hover" />
          <div className="h-18 animate-pulse rounded-[6px] border border-border bg-card-hover" />
          <CmsRichTextFieldLoading labelWidth="w-20" fullHeight />
        </div>
        <div className="space-y-5 lg:border-l lg:border-foreground lg:pl-6">
          <div className="h-24 animate-pulse rounded-[6px] border border-border bg-card-hover" />
        </div>
      </div>
    </div>
  );
}
