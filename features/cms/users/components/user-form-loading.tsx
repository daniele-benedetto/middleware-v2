import { Skeleton } from "@/components/ui/skeleton";
import {
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

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="cms-scroll min-h-0 min-w-0 space-y-5 overflow-y-auto pb-6 lg:pr-6">
          <CmsFieldLoading labelWidth="w-10" />
          <CmsFieldLoading labelWidth="w-12" />
          <CmsFieldLoading labelWidth="w-11" />
          <UserPasswordFieldLoading mode={mode} />
        </div>
      </div>
    </div>
  );
}

function UserPasswordFieldLoading({ mode }: { mode: "create" | "edit" }) {
  return (
    <div>
      <Skeleton className="mb-1.5 h-2.5 w-16 rounded-[6px] bg-card-hover" />
      <div className="relative">
        <Skeleton className="h-10 w-full rounded-[6px] border border-border bg-card-hover" />
        <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
          <Skeleton className="size-7 rounded-[var(--radius-control)] bg-card-hover" />
          <Skeleton className="size-7 rounded-[var(--radius-control)] bg-card-hover" />
        </div>
      </div>
      <Skeleton
        className={`mt-1.25 h-2.5 ${mode === "create" ? "w-28" : "w-52"} rounded-[6px] bg-card-hover`}
      />
    </div>
  );
}
