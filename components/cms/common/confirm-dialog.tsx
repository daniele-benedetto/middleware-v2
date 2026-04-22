import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import type { ReactNode } from "react";

type CmsConfirmDialogProps = {
  trigger: ReactNode;
  title: string;
  description: string;
};

export function CmsConfirmDialog({ trigger, title, description }: CmsConfirmDialogProps) {
  return (
    <Dialog>
      <DialogTrigger>{trigger}</DialogTrigger>
      <DialogContent className="rounded-none border-[3px] border-[#0A0A0A] bg-[#F0E8D8]">
        <DialogHeader>
          <DialogTitle className="font-display text-[24px] uppercase tracking-[-0.03em]">
            {title}
          </DialogTitle>
          <DialogDescription className="text-[16px] leading-[1.55] text-[rgba(10,10,10,0.6)]">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            className="rounded-none border-[#0A0A0A] bg-[#F0E8D8] text-[#0A0A0A]"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="rounded-none border border-[#0A0A0A] bg-[#C8001A] text-white"
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
