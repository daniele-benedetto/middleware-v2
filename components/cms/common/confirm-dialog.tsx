"use client";

import { useState } from "react";

import { CmsActionButton } from "@/components/cms/primitives";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

type CmsConfirmDialogProps = {
  triggerLabel: string;
  triggerIcon?: ReactNode;
  triggerClassName?: string;
  triggerDisabled?: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  footerInfo?: ReactNode;
  onConfirm?: () => void | Promise<unknown>;
  tone?: "default" | "danger";
};

export function CmsConfirmDialog({
  triggerLabel,
  triggerIcon,
  triggerClassName,
  triggerDisabled,
  title,
  description,
  confirmLabel,
  cancelLabel,
  footerInfo,
  onConfirm,
  tone = "danger",
}: CmsConfirmDialogProps) {
  const text = i18n.cms.resource;
  const confirmVariant = tone === "danger" ? "primary-accent" : "primary";
  const [open, setOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    if (!onConfirm || isConfirming) {
      return;
    }

    setIsConfirming(true);

    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isConfirming && !nextOpen) {
          return;
        }

        setOpen(nextOpen);
      }}
    >
      <DialogTrigger
        disabled={triggerDisabled || isConfirming}
        className={cn(
          "inline-flex h-auto cursor-pointer items-center gap-1.5 rounded-[6px] border bg-background px-3.5 py-1.5",
          "font-ui text-[10px] font-bold uppercase tracking-[0.08em] transition-colors",
          "focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-background",
          tone === "danger"
            ? "border-accent text-accent hover:bg-surface-hover"
            : "border-foreground text-foreground hover:bg-surface-hover",
          triggerClassName,
        )}
      >
        {triggerIcon}
        {triggerLabel}
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "w-full max-w-100 gap-0 rounded-[8px] border border-foreground bg-background p-0 sm:max-w-100",
        )}
      >
        <div className="flex items-center justify-between rounded-t-[8px] bg-foreground px-4.5 py-3.5">
          <DialogTitle className="font-display text-[14px] font-extrabold uppercase leading-none tracking-[-0.02em] text-background">
            {title}
          </DialogTitle>
          <DialogClose
            disabled={isConfirming}
            aria-label={text.cancel}
            className="cursor-pointer font-ui text-[16px] leading-none text-background/50 transition-colors hover:text-background focus-visible:text-background"
          >
            ×
          </DialogClose>
        </div>
        <div className="px-4.5 pt-5 pb-4">
          <DialogDescription className="mb-4 font-editorial text-[15px] leading-[1.55] text-body-text">
            {description}
          </DialogDescription>
          <div className="flex flex-wrap gap-2.5">
            <CmsActionButton
              variant={confirmVariant}
              size="md"
              className="flex-1"
              onClick={() => {
                void handleConfirm();
              }}
              isLoading={isConfirming}
            >
              → {confirmLabel ?? text.confirm}
            </CmsActionButton>
            <DialogClose
              disabled={isConfirming}
              render={
                <CmsActionButton variant="outline" size="md" disabled={isConfirming}>
                  {cancelLabel ?? text.cancel}
                </CmsActionButton>
              }
            />
          </div>
        </div>
        {footerInfo ? (
          <div className="border-t border-border px-4.5 py-2.5 font-ui text-[10px] font-bold uppercase leading-none tracking-[0.08em] text-muted-foreground">
            {footerInfo}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
