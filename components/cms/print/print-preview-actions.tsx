"use client";

import { BookOpen, FileText } from "lucide-react";
import { useState } from "react";

import { CmsActionButton } from "@/components/cms/primitives/action-button";

import type { PrintPdfLayout } from "@/lib/print/pdf-layout";

async function downloadPdf(issueId: string, layout: PrintPdfLayout) {
  const response = await fetch(`/api/cms/print/${issueId}/pdf?layout=${layout}`);
  if (!response.ok) throw new Error("PDF export unavailable");

  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `middleware-${issueId}-${layout}.pdf`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function PrintPreviewActions({ issueId, disabled }: { issueId: string; disabled: boolean }) {
  const [pendingLayout, setPendingLayout] = useState<PrintPdfLayout | null>(null);

  async function handleDownload(layout: PrintPdfLayout) {
    setPendingLayout(layout);
    try {
      await downloadPdf(issueId, layout);
    } catch {
      window.print();
    } finally {
      setPendingLayout(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <CmsActionButton
        variant="outline"
        size="xs"
        className="cursor-pointer"
        disabled={disabled || pendingLayout !== null}
        isLoading={pendingLayout === "pages"}
        onClick={() => handleDownload("pages")}
      >
        <FileText aria-hidden />
        PDF pagine A4
      </CmsActionButton>
      <CmsActionButton
        size="xs"
        className="cursor-pointer"
        disabled={disabled || pendingLayout !== null}
        isLoading={pendingLayout === "booklet"}
        onClick={() => handleDownload("booklet")}
      >
        <BookOpen aria-hidden />
        PDF da stampare A3
      </CmsActionButton>
    </div>
  );
}
