import { Skeleton } from "@/components/ui/skeleton";
import {
  CmsFormLoadingHeader,
  CmsRichTextFieldLoading,
} from "@/features/cms/shared/components/form-loading-primitives";

export function CmsMapFormLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <CmsFormLoadingHeader />
      <div className="cms-scroll flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
        <div>
          <Skeleton className="mb-1.5 h-2.5 w-12 rounded-[6px] bg-card-hover" />
          <div className="border border-foreground bg-card">
            <div className="flex items-center gap-1 border-b border-foreground px-2 py-1.5">
              <Skeleton className="h-6 w-16 rounded-[6px] border border-border bg-card-hover" />
              <Skeleton className="h-6 w-6 rounded-[6px] border border-border bg-card-hover" />
            </div>
            <Skeleton className="h-16 w-full rounded-none bg-card-hover" />
          </div>
          <Skeleton className="mt-1.25 h-2.5 w-44 rounded-[6px] bg-card-hover" />
        </div>
        <CmsRichTextFieldLoading labelWidth="w-20" fullHeight />
      </div>
    </div>
  );
}
