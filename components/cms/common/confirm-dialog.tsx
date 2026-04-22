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
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  footerInfo?: ReactNode;
  onConfirm?: () => void;
  tone?: "default" | "danger";
};

export function CmsConfirmDialog({
  triggerLabel,
  triggerIcon,
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

  return (
    <Dialog>
      <DialogTrigger
        className={cn(
          "inline-flex h-auto items-center gap-[6px] rounded-none border border-foreground bg-background px-[14px] py-[7px]",
          "font-ui text-[11px] uppercase tracking-[0.08em] text-foreground transition-colors",
          "hover:bg-[color:var(--bg-hover)] focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
        )}
      >
        {triggerIcon}
        {triggerLabel}
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "w-full max-w-[400px] sm:max-w-[400px] gap-0 rounded-none border-2 border-foreground bg-[color:var(--bg-main)] p-0 ring-0",
        )}
      >
        <div className="flex items-center justify-between bg-foreground px-[18px] py-[14px]">
          <DialogTitle className="font-display text-[14px] uppercase leading-none tracking-[-0.02em] text-white">
            {title}
          </DialogTitle>
          <DialogClose
            aria-label={text.cancel}
            className="cursor-pointer font-ui text-[16px] leading-none text-white/50 transition-colors hover:text-white outline-none focus-visible:text-white"
          >
            ×
          </DialogClose>
        </div>
        <div className="px-[18px] pt-[20px] pb-[16px]">
          <DialogDescription className="mb-[16px] font-editorial text-[15px] leading-[1.55] text-foreground">
            {description}
          </DialogDescription>
          <div className="flex flex-wrap gap-[10px]">
            <CmsActionButton
              variant={confirmVariant}
              size="md"
              className="flex-1"
              onClick={onConfirm}
            >
              → {confirmLabel ?? text.confirm}
            </CmsActionButton>
            <DialogClose
              render={
                <CmsActionButton variant="outline" size="md">
                  {cancelLabel ?? text.cancel}
                </CmsActionButton>
              }
            />
          </div>
        </div>
        {footerInfo ? (
          <div className="border-t border-[color:var(--ink-30)] px-[18px] py-[10px] font-ui text-[10px] uppercase leading-none tracking-[0.04em] text-[color:var(--ink-60)]">
            {footerInfo}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
