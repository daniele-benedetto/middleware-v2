import { PrintFooterQr } from "@/components/cms/print/print-footer-qr";
import { PrintRichText } from "@/components/cms/print/print-rich-text";
import { PrintTitle } from "@/components/cms/print/print-title";

import type { PrintBackCover as PrintBackCoverModel } from "@/lib/print/issue-document";

export function PrintBackCover({
  backCover,
  qrCode,
  siteLabel,
}: {
  backCover: PrintBackCoverModel;
  qrCode: string | null;
  siteLabel: string;
}) {
  return (
    <article
      id={backCover.anchor}
      className={`back-cover${backCover.dark ? " back-cover--dark" : ""}`}
      aria-label="Anticipazione del prossimo numero"
      data-print-anchor={backCover.anchor}
      data-print-label="Nel prossimo numero"
      data-print-fit-pages={1}
    >
      <header className="article__header">
        <PrintTitle as="h2" className="article__title" segments={backCover.title} />
        {backCover.subtitle ? <p className="article__subtitle">{backCover.subtitle}</p> : null}
        <p className="article__meta">
          <span>{backCover.label}</span>
          <span className="article__meta-divider" aria-hidden="true" />
          <span>{backCover.author}</span>
        </p>
      </header>

      <div className="article__body">
        <div data-print-fit-text="">
          <PrintRichText value={backCover.content} dropCap />
        </div>
        {qrCode ? (
          <div className="print-footer-float" data-print-anchor={backCover.anchor}>
            <PrintFooterQr
              qrCode={qrCode}
              label="Continua a leggere su"
              siteLabel={siteLabel}
              alt={`QR code: ${backCover.plainTitle}`}
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}
