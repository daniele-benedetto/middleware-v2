import { CmsConfirmDialog } from "@/components/cms/common/confirm-dialog";
import { CmsActionButton } from "@/components/cms/primitives";
import { cn } from "@/lib/utils";

import type { CmsResolvedQuickAction } from "@/features/cms/shared/actions";

type CmsBulkAction = CmsResolvedQuickAction & {
  isLoading?: boolean;
  onExecute: () => void | Promise<unknown>;
};

type CmsBulkActionBarProps = {
  selectedCount: number;
  actions: CmsBulkAction[];
  onSelectAll?: () => void;
  selectAllDisabled?: boolean;
  className?: string;
};

export function CmsBulkActionBar({ selectedCount, actions, className }: CmsBulkActionBarProps) {
  if (selectedCount <= 0) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-2 max-sm:flex-wrap", className)}>
      <div className="flex items-center gap-1.5 max-sm:flex-wrap">
        {actions.map((action) => {
          const actionLabel = `${action.label} ${selectedCount}`;

          if (action.confirm) {
            return (
              <CmsConfirmDialog
                key={action.id}
                triggerLabel={actionLabel}
                triggerClassName="h-10 bg-transparent"
                triggerDisabled={action.disabled || action.isLoading}
                title={action.confirm.title}
                description={action.confirm.description}
                confirmLabel={action.confirm.confirmLabel}
                cancelLabel={action.confirm.cancelLabel}
                tone={action.tone === "danger" ? "danger" : "default"}
                onConfirm={action.onExecute}
              />
            );
          }

          return (
            <CmsActionButton
              key={action.id}
              variant={action.tone === "danger" ? "outline-accent" : "outline"}
              size="xs"
              className="h-10 bg-transparent"
              disabled={action.disabled || action.isLoading}
              isLoading={action.isLoading}
              onClick={action.onExecute}
            >
              {actionLabel}
            </CmsActionButton>
          );
        })}
      </div>
    </div>
  );
}
