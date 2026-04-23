"use client";

import { CmsConfirmDialog } from "@/components/cms/common/confirm-dialog";
import { CmsActionButton } from "@/components/cms/primitives";

type CmsBulkAction = {
  id: string;
  label: string;
  disabled?: boolean;
  isLoading?: boolean;
  tone?: "default" | "danger";
  requiresConfirm?: boolean;
  confirmTitle?: string;
  confirmDescription?: string;
  onExecute: () => void;
};

type CmsBulkActionBarProps = {
  selectedCount: number;
  actions: CmsBulkAction[];
};

export function CmsBulkActionBar({ selectedCount, actions }: CmsBulkActionBarProps) {
  if (selectedCount <= 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-3 border border-accent px-3 py-2 max-sm:flex-col max-sm:items-stretch">
      <span className="font-ui text-[11px] uppercase tracking-[0.06em] text-accent">
        {selectedCount} selezionati
      </span>

      <div className="flex items-center gap-2 max-sm:flex-wrap">
        {actions.map((action) => {
          if (action.requiresConfirm) {
            return (
              <CmsConfirmDialog
                key={action.id}
                triggerLabel={action.label}
                title={action.confirmTitle ?? "Conferma azione"}
                description={
                  action.confirmDescription ??
                  "Questa azione verra applicata agli elementi selezionati."
                }
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
              disabled={action.disabled}
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
