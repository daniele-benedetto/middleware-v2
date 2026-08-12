import {
  CmsFieldLoading,
  CmsFormLoadingHeader,
  CmsRichTextFieldLoading,
} from "@/features/cms/shared/components/form-loading-primitives";

export function CmsMapWorkspaceLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <CmsFormLoadingHeader />
      <div className="cms-scroll min-h-0 flex-1 overflow-y-auto pb-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <CmsFieldLoading labelWidth="w-12" />
            <CmsRichTextFieldLoading labelWidth="w-20" />
            <div className="h-10 w-72 animate-pulse rounded-[6px] border border-border bg-card-hover" />
            <div className="min-h-96 animate-pulse rounded-[6px] border border-foreground bg-muted" />
          </div>
          <div className="space-y-6">
            <CmsFieldLoading labelWidth="w-36" inputClassName="h-4 w-48" />
            <div className="min-h-96 animate-pulse rounded-[6px] border border-foreground bg-card-hover" />
          </div>
        </div>
      </div>
    </div>
  );
}
