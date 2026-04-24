"use client";

import { CmsConfirmDialog } from "@/components/cms/common/confirm-dialog";
import { CmsActionButton } from "@/components/cms/primitives";
import { i18n } from "@/lib/i18n";

import type { CmsResolvedQuickAction } from "@/features/cms/shared/actions";

type CmsBulkAction = CmsResolvedQuickAction & {
  isLoading?: boolean;
  onExecute: () => void;
};

type CmsBulkActionBarProps = {
  selectedCount: number;
  actions: CmsBulkAction[];
};

export function CmsBulkActionBar({ selectedCount, actions }: CmsBulkActionBarProps) {
  const text = i18n.cms.common;

  if (selectedCount <= 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-3 border border-accent px-3 py-2 max-sm:flex-col max-sm:items-stretch">
      <span className="font-ui text-[11px] uppercase tracking-[0.06em] text-accent">
        {text.selectedCount(selectedCount)}
      </span>

      <div className="flex items-center gap-2 max-sm:flex-wrap">
        {actions.map((action) => {
          if (action.confirm) {
            return (
              <CmsConfirmDialog
                key={action.id}
                triggerLabel={action.label}
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
              variant={action.tone === "danger" ? "primary-accent" : "outline"}
              size="xs"
              disabled={action.disabled || action.isLoading}
              isLoading={action.isLoading}
              onClick={action.onExecute}
            >
              {action.label}
            </CmsActionButton>
          );
        })}
      </div>
    </div>
  );
}
