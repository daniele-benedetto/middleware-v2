import {
  CmsArticlePanelLoading,
  CmsFieldLoading,
  CmsFormLoadingHeader,
} from "@/features/cms/shared/components/form-loading-primitives";

type CmsUserFormLoadingProps = {
  mode?: "create" | "edit";
};

export function CmsUserFormLoading({ mode = "edit" }: CmsUserFormLoadingProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <CmsFormLoadingHeader />

      <div
        className={
          mode === "edit"
            ? "grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_360px]"
            : "grid min-h-0 flex-1 gap-0 overflow-hidden"
        }
      >
        <div className="cms-scroll min-h-0 min-w-0 space-y-5 overflow-y-auto pb-6 lg:pr-6">
          <CmsFieldLoading labelWidth="w-16" />
          <CmsFieldLoading labelWidth="w-12" />
          <CmsFieldLoading labelWidth="w-16" />
          <CmsFieldLoading labelWidth="w-24" hintWidth="w-52" />
        </div>

        {mode === "edit" ? (
          <div className="cms-scroll flex min-h-0 min-w-0 flex-col overflow-y-auto pb-6 lg:border-l lg:border-foreground lg:pl-6">
            <CmsArticlePanelLoading />
          </div>
        ) : null}
      </div>
    </div>
  );
}
