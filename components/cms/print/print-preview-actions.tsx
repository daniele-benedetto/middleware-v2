"use client";

import { Printer } from "lucide-react";

export function PrintPreviewActions() {
  return (
    <button type="button" className="print-preview-action" onClick={() => window.print()}>
      <Printer aria-hidden="true" />
      Stampa / PDF
    </button>
  );
}
