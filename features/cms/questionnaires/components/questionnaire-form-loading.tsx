import {
  CmsFieldLoading,
  CmsFormLoadingHeader,
} from "@/features/cms/shared/components/form-loading-primitives";

export function CmsQuestionnaireFormLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <CmsFormLoadingHeader />
      <CmsFieldLoading labelWidth="w-20" />
      <CmsFieldLoading labelWidth="w-32" />
    </div>
  );
}
