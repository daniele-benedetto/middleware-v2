import { CmsActionButton } from "@/components/cms/primitives";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { i18n } from "@/lib/i18n";

import type { ReactNode } from "react";

type CmsConfirmDialogProps = {
  triggerLabel: string;
  triggerIcon?: ReactNode;
  title: string;
  description: string;
};

export function CmsConfirmDialog({
  triggerLabel,
  triggerIcon,
  title,
  description,
}: CmsConfirmDialogProps) {
  const text = i18n.cms.resource;

  return (
    <Dialog>
      <DialogTrigger className="inline-flex h-8 items-center gap-1.5 rounded-none border border-foreground bg-background px-2.5 font-ui text-[11px] uppercase tracking-[0.08em] text-foreground transition-colors hover:bg-secondary">
        {triggerIcon}
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="rounded-none border-[3px] border-foreground bg-background">
        <DialogHeader>
          <DialogTitle className="font-display text-[24px] uppercase tracking-[-0.03em]">
            {title}
          </DialogTitle>
          <DialogDescription className="text-[16px] leading-[1.55] text-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <CmsActionButton className="px-2.5" tone="secondary">
            {text.cancel}
          </CmsActionButton>
          <CmsActionButton className="px-2.5" tone="danger">
            {text.confirm}
          </CmsActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
