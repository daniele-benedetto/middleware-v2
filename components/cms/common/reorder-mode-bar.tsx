"use client";

import { Save, X } from "lucide-react";

import { CmsActionButton, CmsMetaText } from "@/components/cms/primitives";

type CmsReorderModeBarProps = {
  isAvailable: boolean;
  isReorderMode: boolean;
  hasChanges: boolean;
  isSaving: boolean;
  helpText: string;
  unavailableText: string;
  onStart: () => void;
  onCancel: () => void;
  onSave: () => void;
};

export function CmsReorderModeBar({
  isAvailable,
  isReorderMode,
  hasChanges,
  isSaving,
  helpText,
  unavailableText,
  onStart,
  onCancel,
  onSave,
}: CmsReorderModeBarProps) {
  return (
    <div className="flex items-center justify-between gap-3 max-sm:flex-col max-sm:items-stretch">
      <CmsMetaText variant="tiny" className="block">
        {isAvailable ? helpText : unavailableText}
      </CmsMetaText>

      {isReorderMode ? (
        <div className="flex items-center gap-2 max-sm:w-full">
          <CmsActionButton
            variant="outline"
            size="xs"
            disabled={isSaving}
            onClick={onCancel}
            className="max-sm:flex-1"
          >
            <X className="size-3" />
            Annulla
          </CmsActionButton>
          <CmsActionButton
            variant="outline-accent"
            size="xs"
            disabled={!hasChanges || isSaving}
            isLoading={isSaving}
            onClick={onSave}
            className="max-sm:flex-1"
          >
            <Save className="size-3" />
            Salva ordine
          </CmsActionButton>
        </div>
      ) : (
        <CmsActionButton
          variant="outline"
          size="xs"
          disabled={!isAvailable || isSaving}
          onClick={onStart}
        >
          Modalita reorder
        </CmsActionButton>
      )}
    </div>
  );
}
