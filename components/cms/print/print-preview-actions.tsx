"use client";

import { Printer } from "lucide-react";
import { useEffect, useState } from "react";

export function PrintPreviewActions() {
  const [coverOverflows, setCoverOverflows] = useState(false);

  useEffect(() => {
    const cover = document.querySelector<HTMLElement>(".magazine-cover");
    const content = cover?.querySelector<HTMLElement>(".magazine-cover__inner");
    if (!cover || !content) return;

    const checkFit = () => {
      const footer = content.querySelector<HTMLElement>(".magazine-cover__footer");
      const highlights = content.querySelector<HTMLElement>(".magazine-cover__highlights");
      setCoverOverflows(
        content.scrollHeight > content.clientHeight + 1 ||
          (footer !== null &&
            highlights !== null &&
            highlights.getBoundingClientRect().bottom > footer.getBoundingClientRect().top + 1),
      );
    };

    const observer = new ResizeObserver(checkFit);
    observer.observe(cover);
    for (const element of content.children) observer.observe(element);
    void document.fonts.ready.then(checkFit);
    checkFit();

    return () => observer.disconnect();
  }, []);

  return (
    <div className="print-preview-actions">
      <span className="print-preview-hint" role={coverOverflows ? "status" : undefined}>
        {coverOverflows
          ? "La copertina supera il formato A4: riduci i contenuti prima di stampare"
          : "Scorri per vedere le pagine"}
      </span>
      <button
        type="button"
        className="print-preview-action"
        disabled={coverOverflows}
        onClick={() => window.print()}
      >
        <Printer aria-hidden="true" />
        Stampa / PDF
      </button>
    </div>
  );
}
