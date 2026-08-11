import {
  CmsFieldLoading,
  CmsFormLoadingHeader,
  CmsRichTextFieldLoading,
  CmsSectionLabelLoading,
} from "@/features/cms/shared/components/form-loading-primitives";

export function CmsMapFormLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <CmsFormLoadingHeader />
      <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="cms-scroll flex min-h-0 min-w-0 flex-col gap-5 overflow-y-auto pb-6 lg:pr-6">
          <CmsFieldLoading labelWidth="w-12" />
          <CmsRichTextFieldLoading labelWidth="w-20" fullHeight />
        </div>
        <div className="cms-scroll flex min-h-0 min-w-0 flex-col gap-6 overflow-y-auto pb-6 lg:border-l lg:border-foreground lg:pl-6">
          <section className="space-y-3">
            <CmsSectionLabelLoading />
            <CmsFieldLoading labelWidth="w-48" />
          </section>
        </div>
      </div>
    </div>
  );
}
