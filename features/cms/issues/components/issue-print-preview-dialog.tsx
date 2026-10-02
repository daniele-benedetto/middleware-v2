"use client";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

type IssuePrintPreviewDialogProps = {
  issueId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function IssuePrintPreviewDialog({
  issueId,
  open,
  onOpenChange,
}: IssuePrintPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-none overflow-hidden border-0 bg-transparent p-0 shadow-none sm:max-w-none">
        <DialogTitle className="sr-only">Anteprima di stampa dell’uscita</DialogTitle>
        <DialogDescription className="sr-only">
          Pagine del numero affiancate con scorrimento orizzontale.
        </DialogDescription>
        <iframe
          title="Anteprima di stampa dell’uscita"
          src={`/cms/print/${issueId}`}
          className="h-full w-full border-0"
        />
      </DialogContent>
    </Dialog>
  );
}
