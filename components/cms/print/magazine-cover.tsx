import Image from "next/image";

import { CmsMediaImage } from "@/features/cms/media/components/media-image";
import { extractCmsMediaPathname } from "@/lib/media/blob";
import { extractPlainText } from "@/lib/rich-text/plain-text";

import type { IssueDetail } from "@/features/cms/issues/hooks/use-issue-crud";
import type { IssuePrintItem } from "@/lib/print/issue-view-model";

type MagazineCoverProps = {
  issue: IssueDetail;
  issueNumber: string;
  introItems: IssuePrintItem[];
  fallbackImage: { pathname: string; alt: string } | null;
  resourceTitles: Record<string, string>;
  qrCode: string;
};

function formatDate(value: string | null) {
  if (!value) return "Data non indicata";

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Data non indicata"
    : date.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
}

function blockLabel(type: string) {
  return (
    {
      opening: "Editoriale",
      body: "Contributi",
      rupture: "Approfondimenti",
      closing: "Editoriale",
      course: "Contro-formazione",
      map: "Mappatura",
      questionnaireAnalysis: "Raccolta dati",
      preview: "Anteprima",
    }[type] ?? type
  );
}

function itemTitle(item: IssuePrintItem, resourceTitles: Record<string, string>) {
  return item.kind === "article"
    ? item.article.title
    : (resourceTitles[item.resourceId ?? ""] ?? blockLabel(item.type));
}

export function MagazineCover({
  issue,
  issueNumber,
  introItems,
  fallbackImage,
  resourceTitles,
  qrCode,
}: MagazineCoverProps) {
  const configuredCoverImagePath = issue.printSettings.coverImageUrl
    ? extractCmsMediaPathname(issue.printSettings.coverImageUrl)
    : null;
  const coverImage = configuredCoverImagePath
    ? {
        pathname: configuredCoverImagePath,
        alt: issue.printSettings.coverImageAlt || issue.title,
      }
    : fallbackImage;
  const description = extractPlainText(issue.description) ?? "";
  const coverLines = introItems.slice(0, 3);
  const titleSegments = issue.titleStyled ?? [{ text: issue.title, tone: "default" as const }];

  return (
    <section
      className={`magazine-cover${description.length > 400 ? " magazine-cover--long-description" : ""}`}
      aria-label="Copertina del numero"
    >
      <div className="magazine-cover__inner">
        <header className="magazine-cover__meta">
          <span>
            Numero {issueNumber} · {formatDate(issue.publishedAt)}
          </span>
          <span>Offerta libera</span>
        </header>

        <Image
          className="magazine-cover__logo"
          src="/brand/middleware-logo-extended-black.png"
          alt="Middleware"
          width={920}
          height={100}
          priority
        />

        {coverImage ? (
          <figure
            className={`magazine-cover__image${
              issue.printSettings.coverImageMode === "bleed" ? " magazine-cover__image--bleed" : ""
            }`}
          >
            <CmsMediaImage
              pathname={coverImage.pathname}
              alt={coverImage.alt}
              sizes="(min-width: 900px) 48vw, 88vw"
              preload
              className="magazine-cover__image-content"
            />
          </figure>
        ) : null}

        <h1 className="magazine-cover__title">
          {titleSegments.map((segment, index) => (
            <span
              key={`${segment.text}-${index}`}
              className={segment.tone === "primary" ? "magazine-cover__title-accent" : undefined}
            >
              {segment.text}
            </span>
          ))}
        </h1>

        {description ? <p className="magazine-cover__deck">{description}</p> : null}

        <div className="magazine-cover__highlights" aria-label="Contenuti in evidenza">
          {coverLines.map((item) => (
            <article
              className="magazine-cover__highlight"
              key={item.kind === "article" ? item.article.id : item.id}
            >
              <span className="magazine-cover__highlight-kicker">{blockLabel(item.type)}</span>
              <h2 className="magazine-cover__highlight-title">{itemTitle(item, resourceTitles)}</h2>
              <p className="magazine-cover__highlight-excerpt">
                {item.kind === "article" ? item.article.excerpt : null}
              </p>
              <span className="magazine-cover__highlight-page">
                p. {String(item.page).padStart(2, "0")}
              </span>
            </article>
          ))}
          {coverLines.length === 0 ? (
            <p className="magazine-cover__empty">
              Aggiungi contenuti all’indice per comporre i richiami.
            </p>
          ) : null}
        </div>

        <footer className="magazine-cover__footer">
          <div className="magazine-cover__brand">
            <Image src="/brand/middleware-pictogram-red.png" alt="" width={44} height={44} />
            <strong>
              Laboratorio di inchiesta <span>Modena</span>
            </strong>
          </div>
          <div className="magazine-cover__service">
            <span>
              Leggi online
              <br />
              middleware.media
            </span>
            <Image
              src={qrCode}
              alt="QR code: middleware.media"
              width={128}
              height={128}
              unoptimized
            />
          </div>
        </footer>
      </div>
    </section>
  );
}
