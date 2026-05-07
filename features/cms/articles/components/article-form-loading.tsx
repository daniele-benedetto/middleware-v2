import { Skeleton } from "@/components/ui/skeleton";
import {
  CmsFieldLoading,
  CmsFormLoadingHeader,
  CmsRichTextFieldLoading,
  CmsSectionLabelLoading,
  CmsSlugFieldLoading,
} from "@/features/cms/shared/components/form-loading-primitives";

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

type CmsArticleFormLoadingProps = {
  mode?: "create" | "edit";
};

export function CmsArticleFormLoading({ mode = "edit" }: CmsArticleFormLoadingProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <CmsFormLoadingHeader />

      <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="cms-scroll flex min-h-0 min-w-0 flex-col gap-5 overflow-y-auto pb-6 lg:pr-6">
          <CmsFieldLoading labelWidth="w-12" />
          <CmsSlugFieldLoading />
          <CmsRichTextFieldLoading labelWidth="w-20" fullHeight />
          <CmsRichTextFieldLoading labelWidth="w-20" height="h-28" />
        </div>

        <div className="cms-scroll min-h-0 min-w-0 space-y-6 overflow-y-auto pb-6 lg:border-l lg:border-foreground lg:pl-6">
          <section className="space-y-3">
            <CmsSectionLabelLoading />
            {mode === "edit" ? (
              <div className="space-y-4">
                <CmsFieldLoading labelWidth="w-16" />
                <div className="flex items-center gap-2">
                  <Skeleton className="size-4 rounded-none border border-border bg-card-hover" />
                  <Skeleton className="h-3 w-20 rounded-none bg-card-hover" />
                </div>
              </div>
            ) : (
              <Skeleton className="h-9 w-full rounded-none border border-dashed border-border bg-card-hover" />
            )}
          </section>

          <section className="space-y-3">
            <CmsSectionLabelLoading />
            <div className="space-y-4">
              <CmsFieldLoading labelWidth="w-16" />
              <CmsFieldLoading labelWidth="w-20" />
              <CmsFieldLoading labelWidth="w-16" />
            </div>
          </section>

          <section className="space-y-3">
            <CmsSectionLabelLoading width="w-12" />
            <CmsFieldLoading labelWidth="w-10" />
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
            <CmsSectionLabelLoading />
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
