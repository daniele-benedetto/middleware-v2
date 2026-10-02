import { PrintFooterQr } from "@/components/cms/print/print-footer-qr";
import { PrintTitle } from "@/components/cms/print/print-title";

import type { PrintBackCover as PrintBackCoverModel } from "@/lib/print/issue-document";

/* eslint-disable @next/next/no-img-element -- the print document is serialized for the paginator. */

function issueDigits(issueNumber: string) {
  return issueNumber.match(/\d+/)?.[0] ?? issueNumber;
}

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
    <section
      className={`back-cover${backCover.dark ? " back-cover--dark" : ""}`}
      aria-label="Quarta di copertina"
    >
      <header className="back-cover__meta">
        <span className="accent">Nel prossimo numero</span>
        <span>{backCover.issueNumber}</span>
      </header>

      <p className="back-cover__number accent" aria-hidden="true">
        {issueDigits(backCover.issueNumber)}
      </p>

      <article className="back-cover__article">
        <PrintTitle as="h2" className="back-cover__title" segments={backCover.title} />
        {backCover.subtitle ? <p className="article__subtitle">{backCover.subtitle}</p> : null}
        {backCover.deck ? <p className="back-cover__deck">{backCover.deck}</p> : null}
        <p className="article__meta">
          <span>{backCover.label}</span>
          <span className="article__meta-divider" aria-hidden="true" />
          <span>{backCover.author}</span>
        </p>
      </article>

      <img
        className="back-cover__logo"
        src={
          backCover.dark
            ? "/brand/middleware-logo-extended-white.png"
            : "/brand/middleware-logo-extended-black.png"
        }
        alt="Middleware"
      />

      {qrCode ? (
        <PrintFooterQr
          qrCode={qrCode}
          label="Leggi l’anteprima su"
          siteLabel={siteLabel}
          alt={`QR code: ${backCover.plainTitle}`}
        />
      ) : null}
    </section>
  );
}
