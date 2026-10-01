import { PrintTitle } from "@/components/cms/print/print-title";
import { resolveCmsMediaPreviewUrl } from "@/lib/media/blob";

import type { PrintCover as PrintCoverModel } from "@/lib/print/issue-document";

/* eslint-disable @next/next/no-img-element -- the print document is serialized for the paginator. */

export function PrintCover({
  cover,
  qrCode,
  siteLabel,
}: {
  cover: PrintCoverModel;
  qrCode: string;
  siteLabel: string;
}) {
  return (
    <section className="cover" aria-label="Copertina">
      <header className="cover__meta">
        <span>{cover.meta}</span>
        <span className="accent">Offerta libera</span>
      </header>

      <img
        className="cover__logo"
        src="/brand/middleware-logo-extended-black.png"
        alt="Middleware"
      />

      {cover.image ? (
        <figure className={`cover__image${cover.image.bleed ? " cover__image--bleed" : ""}`}>
          <img src={resolveCmsMediaPreviewUrl(cover.image.url)} alt={cover.image.alt} />
        </figure>
      ) : (
        <div className="cover__spacer" />
      )}

      <PrintTitle as="h1" className="cover__title" segments={cover.title} />
      {cover.deck ? <p className="cover__deck">{cover.deck}</p> : null}

      {cover.highlights.length > 0 ? (
        <div className="cover__highlights">
          {cover.highlights.map((highlight) => (
            <article className="cover__highlight" key={highlight.anchor}>
              <span className="cover__highlight-kicker">{highlight.label}</span>
              <span className="cover__highlight-title">{highlight.title}</span>
              {highlight.excerpt ? (
                <span className="cover__highlight-excerpt">{highlight.excerpt}</span>
              ) : null}
              <span className="cover__highlight-page">
                p. <span data-print-ref={highlight.anchor} />
              </span>
            </article>
          ))}
        </div>
      ) : null}

      <footer className="cover__footer">
        <div className="cover__brand">
          <img src="/brand/middleware-pictogram-red.png" alt="" />
          <strong>
            Laboratorio di inchiesta <span>Modena</span>
          </strong>
        </div>
        <div className="cover__service">
          <span>
            Leggi online
            <br />
            {siteLabel}
          </span>
          <img src={qrCode} alt={`QR code: ${siteLabel}`} />
        </div>
      </footer>
    </section>
  );
}
