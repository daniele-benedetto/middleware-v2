"use client";

import { BookOpen } from "lucide-react";
import { useState } from "react";

import { CmsActionButton } from "@/components/cms/primitives/action-button";
import { printFormat } from "@/lib/print/format";

async function downloadBookletPdf(issueId: string) {
  const response = await fetch(`/api/cms/print/${issueId}/pdf`);
  if (!response.ok) throw new Error("PDF export unavailable");

  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `middleware-${issueId}-libretto.pdf`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function PrintPreviewActions({ issueId, disabled }: { issueId: string; disabled: boolean }) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleDownload() {
    setPending(true);
    setFailed(false);
    try {
      await downloadBookletPdf(issueId);
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
      {failed ? (
        <p className="font-ui text-[12px] text-accent" role="alert">
          Generazione del PDF non riuscita. Riprova tra qualche istante.
        </p>
      ) : null}
      <CmsActionButton
        size="xs"
        className="cursor-pointer"
        disabled={disabled || pending}
        isLoading={pending}
        onClick={handleDownload}
      >
        <BookOpen aria-hidden />
        Scarica il libretto da stampare (fogli {printFormat.sheetLabel})
      </CmsActionButton>
    </div>
  );
}
