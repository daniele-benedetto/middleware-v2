import { Skeleton } from "@/components/ui/skeleton";
import {
  CmsFieldLoading,
  CmsFormLoadingHeader,
  CmsRichTextFieldLoading,
  CmsSectionLabelLoading,
  CmsSlugFieldLoading,
} from "@/features/cms/shared/components/form-loading-primitives";

export function CmsPageFormLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <CmsFormLoadingHeader />

      <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="cms-scroll flex min-h-0 min-w-0 flex-col gap-5 overflow-y-auto pb-6 lg:pr-6">
          <CmsFieldLoading labelWidth="w-12" />
          <CmsSlugFieldLoading />
          <CmsRichTextFieldLoading labelWidth="w-20" fullHeight />
        </div>

        <div className="cms-scroll min-h-0 min-w-0 space-y-6 overflow-y-auto pb-6 lg:border-l lg:border-foreground lg:pl-6">
          <section className="space-y-3">
            <CmsSectionLabelLoading />
            <div className="space-y-4">
              <CmsFieldLoading labelWidth="w-16" />
            </div>
          </section>
          <Skeleton className="h-9 w-full rounded-[6px] border border-dashed border-border bg-card-hover" />
        </div>
      </div>
    </div>
  );
}
