"use client";

import { X } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

import { CmsActionButton, CmsMetaText } from "@/components/cms/primitives";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { CmsMediaLibraryLoading } from "@/features/cms/media/components/media-library-loading";
import { i18n } from "@/lib/i18n";

import type { CmsSupportedMediaKind } from "@/lib/media/blob";
import type { RouterOutputs } from "@/lib/trpc/types";
import type { PutBlobResult } from "@vercel/blob";

const CmsMediaLibrary = dynamic(
  () => import("@/features/cms/media/components/media-library").then((mod) => mod.CmsMediaLibrary),
  {
    ssr: false,
    loading: () => <CmsMediaLibraryLoading />,
  },
);

type MediaItem = RouterOutputs["media"]["list"]["items"][number];

type CmsMediaPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  selectActionLabel: string;
  allowedKinds: CmsSupportedMediaKind[];
  onSelectUrl: (url: string) => void;
  selectionMode?: "preview" | "select-inline";
};

export function CmsMediaPickerDialog({
  open,
  onOpenChange,
  title,
  description,
  selectActionLabel,
  allowedKinds,
  onSelectUrl,
  selectionMode = "preview",
}: CmsMediaPickerDialogProps) {
  const commonText = i18n.cms.common;
  const mediaText = i18n.cms.lists.media;
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);

  const handleSelectItem = async (item: MediaItem) => {
    onSelectUrl(item.url);
    onOpenChange(false);
  };

  const handleUploaded = async (blob: PutBlobResult) => {
    if (selectionMode === "select-inline") {
      return;
    }

    onSelectUrl(blob.url);
    onOpenChange(false);
  };

  const handleConfirmInlineSelection = () => {
    if (!selectedItem) {
      return;
    }

    onSelectUrl(selectedItem.url);
    onOpenChange(false);
  };

  const isInlineSelectionMode = selectionMode === "select-inline";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setSelectedItem(null);
        }

        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="h-[calc(100vh-0.75rem)] w-[calc(100vw-0.75rem)] max-w-[calc(100vw-0.75rem)] sm:max-w-[calc(100vw-0.75rem)] gap-0 rounded-none border border-foreground bg-(--bg-main) p-0 ring-0"
      >
        <div className="border-b-[3px] border-foreground bg-background px-7 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2.5">
              <DialogTitle className="font-display text-[24px] uppercase leading-none tracking-[-0.02em] text-foreground">
                {title}
              </DialogTitle>
              <DialogDescription className="max-w-200 font-editorial text-[16px] leading-[1.55] text-foreground">
                {description}
              </DialogDescription>
            </div>
            <DialogClose className="inline-flex size-8 shrink-0 items-center justify-center border border-foreground bg-transparent transition-colors hover:bg-card-hover">
              <X className="size-3.5" aria-hidden />
              <span className="sr-only">{commonText.close}</span>
            </DialogClose>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-7 py-5">
          <CmsMediaLibrary
            allowedKinds={allowedKinds}
            interactionMode={isInlineSelectionMode ? "select-inline" : "preview"}
            onSelectionChange={isInlineSelectionMode ? setSelectedItem : undefined}
            selectActionLabel={isInlineSelectionMode ? undefined : selectActionLabel}
            onSelectItem={isInlineSelectionMode ? undefined : handleSelectItem}
            onBlobUploaded={handleUploaded}
          />
        </div>

        {isInlineSelectionMode ? (
          <div className="flex items-center justify-between gap-4 border-t-[3px] border-foreground bg-background px-7 py-5 max-sm:flex-col max-sm:items-stretch">
            <div className="min-w-0">
              <CmsMetaText variant="tiny">
                {selectedItem ? selectedItem.fileName : mediaText.imagePickerEmptySelection}
              </CmsMetaText>
            </div>
            <div className="flex items-center gap-2 max-sm:w-full max-sm:flex-col">
              <DialogClose
                render={
                  <CmsActionButton variant="outline" size="md" className="max-sm:w-full">
                    {commonText.cancel}
                  </CmsActionButton>
                }
              />
              <CmsActionButton
                variant="primary-accent"
                size="md"
                className="max-sm:w-full"
                disabled={!selectedItem}
                onClick={handleConfirmInlineSelection}
              >
                {selectActionLabel}
              </CmsActionButton>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
