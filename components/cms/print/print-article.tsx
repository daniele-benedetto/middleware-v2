import { PrintFooterQr } from "@/components/cms/print/print-footer-qr";
import { PrintRichText } from "@/components/cms/print/print-rich-text";
import { PrintTitle } from "@/components/cms/print/print-title";
import { resolveCmsMediaPreviewUrl } from "@/lib/media/blob";
import { PRINT_FIT_PAGES, type PrintArticleSection } from "@/lib/print/issue-document";

/* eslint-disable @next/next/no-img-element -- the print document is serialized for the paginator. */

function articleClassName(article: PrintArticleSection) {
  return [
    "article",
    `article--${article.role}`,
    article.dark ? "article--dark" : null,
    article.stopWithSiteCta ? "article--stop" : null,
    article.layout === "fullscreen" ? "article--fullscreen" : null,
    article.layout === "halfpage" ? "article--halfpage" : null,
  ]
    .filter(Boolean)
    .join(" ");
}

/** A fullscreen opening is a page of its own: the cut text keeps two more pages. */
function fitPages(article: PrintArticleSection) {
  return article.layout === "fullscreen" ? PRINT_FIT_PAGES + 1 : PRINT_FIT_PAGES;
}

export function PrintArticle({
  article,
  qrCode,
  siteLabel,
}: {
  article: PrintArticleSection;
  qrCode: string | null;
  siteLabel: string;
}) {
  const meta = (
    <p className="article__meta">
      <span>{article.label}</span>
      <span className="article__meta-divider" aria-hidden="true" />
      <span>{article.author}</span>
    </p>
  );

  return (
    <article
      id={article.anchor}
      className={articleClassName(article)}
      data-print-anchor={article.anchor}
      data-print-label={article.label}
      data-print-end-logo={article.showEndLogo ? "" : undefined}
      data-print-fit-pages={article.stopWithSiteCta ? fitPages(article) : undefined}
    >
      <div className="article__opening">
        {article.image ? (
          <figure className="article__image">
            <img src={resolveCmsMediaPreviewUrl(article.image.url)} alt={article.image.alt} />
          </figure>
        ) : null}

        <header className="article__header">
          <PrintTitle as="h2" className="article__title" segments={article.title} />
          {article.subtitle ? <p className="article__subtitle">{article.subtitle}</p> : null}
          {article.layout === "fullscreen" && article.deck ? (
            <p className="article__lead">{article.deck}</p>
          ) : null}
          {article.layout === "halfpage" ? null : meta}
        </header>
      </div>

      {article.layout === "halfpage" ? meta : null}

      <div className="article__body">
        {article.stopWithSiteCta ? (
          <div data-print-fit-text="">
            <PrintRichText value={article.content} />
          </div>
        ) : (
          <PrintRichText value={article.content} />
        )}
        {article.stopWithSiteCta && qrCode ? (
          <div className="print-footer-float">
            <PrintFooterQr
              qrCode={qrCode}
              label={article.ctaLabel}
              siteLabel={siteLabel}
              alt={`QR code: ${article.plainTitle}`}
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}
