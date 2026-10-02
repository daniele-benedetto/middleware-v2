"use client";

import { BookOpen, FileText } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { CmsActionButton } from "@/components/cms/primitives/action-button";
import { printFormats, printFormatSchema, type PrintFormat } from "@/lib/print/format";

import type { PrintPdfLayout } from "@/lib/print/pdf-layout";

async function downloadPdf(issueId: string, format: PrintFormat, layout: PrintPdfLayout) {
  const response = await fetch(`/api/cms/print/${issueId}/pdf?format=${format}&layout=${layout}`);
  if (!response.ok) throw new Error("PDF export unavailable");

  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `middleware-${issueId}-${format}-${layout}.pdf`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function PrintFormatSwitch({ format, disabled }: { format: PrintFormat; disabled: boolean }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Formato pagina">
      {printFormatSchema.options.map((option) => (
        <CmsActionButton
          key={option}
          variant={option === format ? "primary" : "outline"}
          size="xs"
          className="cursor-pointer"
          disabled={disabled}
          aria-pressed={option === format}
          onClick={() => {
            if (option !== format) router.replace(`${pathname}?format=${option}`);
          }}
        >
          {printFormats[option].pageLabel}
        </CmsActionButton>
      ))}
    </div>
  );
}

export function PrintPreviewActions({
  issueId,
  format,
  disabled,
}: {
  issueId: string;
  format: PrintFormat;
  disabled: boolean;
}) {
  const [pendingLayout, setPendingLayout] = useState<PrintPdfLayout | null>(null);
  const { pageLabel, sheetLabel } = printFormats[format];

  async function handleDownload(layout: PrintPdfLayout) {
    setPendingLayout(layout);
    try {
      await downloadPdf(issueId, format, layout);
    } catch {
      window.print();
    } finally {
      setPendingLayout(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <PrintFormatSwitch format={format} disabled={pendingLayout !== null} />
      <CmsActionButton
        variant="outline"
        size="xs"
        className="cursor-pointer"
        disabled={disabled || pendingLayout !== null}
        isLoading={pendingLayout === "pages"}
        onClick={() => handleDownload("pages")}
      >
        <FileText aria-hidden />
        PDF pagine {pageLabel}
      </CmsActionButton>
      <CmsActionButton
        size="xs"
        className="cursor-pointer"
        disabled={disabled || pendingLayout !== null}
        isLoading={pendingLayout === "booklet"}
        onClick={() => handleDownload("booklet")}
      >
        <BookOpen aria-hidden />
        PDF da stampare {sheetLabel}
      </CmsActionButton>
    </div>
  );
}
