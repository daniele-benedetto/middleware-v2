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
      <Skeleton className={`mb-1.5 h-2.5 ${labelWidth} rounded-[6px] bg-card-hover`} />
      <div className="space-y-3">
        <Skeleton className="aspect-[16/10] w-full rounded-[8px] border border-dashed border-border bg-card-hover" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-7 w-32 rounded-[6px] border border-border bg-card-hover" />
        </div>
      </div>
    </div>
  );
}

type CmsLessonFormLoadingProps = {
  mode?: "create" | "edit";
};

export function CmsLessonFormLoading({ mode = "edit" }: CmsLessonFormLoadingProps) {
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
              <CmsFieldLoading labelWidth="w-16" />
            ) : (
              <Skeleton className="h-9 w-full rounded-[6px] border border-dashed border-border bg-card-hover" />
            )}
          </section>

          <section className="space-y-3">
            <CmsSectionLabelLoading width="w-12" />
            <CmsFieldLoading labelWidth="w-16" />
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
