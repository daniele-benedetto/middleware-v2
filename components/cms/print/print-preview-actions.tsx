"use client";

import { Printer } from "lucide-react";

export function PrintPreviewActions({ issueId }: { issueId: string }) {
  async function handlePrint() {
    try {
      const response = await fetch(`/api/cms/print/${issueId}/pdf`);
      if (!response.ok) throw new Error("PDF export unavailable");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `middleware-${issueId}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      window.print();
    }
  }

  return (
    <div className="print-preview-actions">
      <button type="button" className="print-preview-action" onClick={handlePrint}>
        <Printer aria-hidden="true" />
        Stampa / PDF
      </button>
    </div>
  );
}
