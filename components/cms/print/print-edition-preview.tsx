import Image from "next/image";

import { PrintPreviewActions } from "@/components/cms/print/print-preview-actions";
import { CmsMediaImage } from "@/features/cms/media/components/media-image";
import { buildEditionIndex, composePrintEdition } from "@/lib/print/compose-edition";
import { applyPrintEditionOverrides, buildPrintEditionManifest } from "@/lib/print/issue-manifest";
import { runPrintPreflight } from "@/lib/print/preflight";

import type { PrintIssuePreviewSource } from "@/components/cms/print/print-prototype";
import type { PrintEditionManifestInput } from "@/lib/print/edition-schema";
import type { PrintReadingBlock } from "@/lib/print/reading-blocks";

function ReadingBlock({ block }: { block: PrintReadingBlock }) {
  if (block.kind === "image") {
    return (
      <figure className="print-composed-image">
        <Image src={block.src} alt={block.caption} width={1200} height={800} />
        {block.caption ? <figcaption>{block.caption}</figcaption> : null}
      </figure>
    );
  }
  if (block.kind === "heading") return <h3>{block.text}</h3>;
  if (block.kind === "quote") return <blockquote>{block.text}</blockquote>;
  if (block.kind === "list") return <p className="print-composed-list-item">{block.text}</p>;
  return <p>{block.text}</p>;
}

function ComposedPage({
  page,
  indexEntries,
}: {
  page: ReturnType<typeof composePrintEdition>["pages"][number];
  indexEntries: ReturnType<typeof buildEditionIndex>;
}) {
  const isArticle = page.itemId !== "cover" && page.itemId !== "index" && page.blocks.length > 0;
  return (
    <article className={`print-sheet print-sheet--${page.family === "cover" ? "ink" : "paper"}`}>
      <span className="print-sheet__folio">{String(page.number).padStart(2, "0")}</span>
      {page.family === "blank" ? null : page.family === "cover" ? (
        <div className="print-composed-cover">
          <span className="print-cover-mark">MIDDLEWARE / EDIZIONE</span>
          <h1>{page.title}</h1>
          <div className="print-cover-rule" />
          <p>Numero editoriale composto dai contenuti pubblicati dell’issue.</p>
        </div>
      ) : page.family === "index" ? (
        <div className="print-composed-index">
          <p className="print-section-label">INDICE</p>
          <h2>Il numero.</h2>
          <ol>
            {indexEntries.map((entry, index) => (
              <li key={entry.itemId}>
                <span>{String(index + 1).padStart(2, "0")}</span> {entry.title} · {entry.page}
              </li>
            ))}
          </ol>
        </div>
      ) : isArticle ? (
        <div className="print-composed-article">
          <div className="print-page-header">
            <span>{page.section.toUpperCase()}</span>
            <span>{page.family === "article-continuation" ? "CONTINUAZIONE" : "APERTURA"}</span>
          </div>
          <header
            className={
              page.family === "article-continuation" ? "print-composed-article__continuation" : ""
            }
          >
            <span className="print-article-number">{String(page.number - 2).padStart(2, "0")}</span>
            <h2>{page.title}</h2>
            {page.family !== "article-continuation" ? (
              <p className="print-article-deck">{page.excerpt}</p>
            ) : null}
            <p className="print-meta-line">{page.authorName ?? "AUTORE NON INDICATO"}</p>
          </header>
          {page.selectedImageUrl ? (
            <figure className="print-composed-selected-image">
              <CmsMediaImage
                pathname={page.selectedImageUrl}
                alt={`Asset selezionato per ${page.title}`}
                sizes="(min-width: 900px) 45vw, 100vw"
                className="object-cover"
              />
            </figure>
          ) : null}
          <div className="print-composed-body">
            {page.blocks.map((block, index) => (
              <ReadingBlock key={`${page.itemId}-${index}`} block={block} />
            ))}
          </div>
        </div>
      ) : (
        <div className="print-composed-special">
          <div className="print-page-header">
            <span>{page.section.toUpperCase()}</span>
            <span>{page.family.replaceAll("-", " ")}</span>
          </div>
          <p className="print-section-label">APPARATO DA PREPARARE</p>
          <h2>{page.title}</h2>
          <p>
            Questa pagina è riconosciuta dal manifesto dell’edizione e attende il proprio asset
            editoriale per la stampa.
          </p>
        </div>
      )}
    </article>
  );
}

export function PrintEditionPreview({
  issue,
  edition,
}: {
  issue: PrintIssuePreviewSource;
  edition?: {
    title: string;
    manifest: Pick<PrintEditionManifestInput, "overrides">;
  };
}) {
  const baseManifest = buildPrintEditionManifest({
    issueId: issue.issueId,
    issueNumber: issue.issueNumber,
    title: issue.title,
    articles: issue.articles,
    courses: issue.courses,
    maps: issue.maps,
    questionnaireAnalyses: issue.questionnaireAnalyses,
    homeBlocks: issue.homeBlocks,
  });
  const manifest = edition
    ? applyPrintEditionOverrides(baseManifest, edition.manifest)
    : baseManifest;
  if (edition) manifest.title = edition.title;
  const composition = composePrintEdition(manifest, issue.articles);
  const indexEntries = buildEditionIndex(composition.pages);
  const preflight = runPrintPreflight({ manifest, composition, articles: issue.articles });
  const preflightMessages = [
    ...preflight.issues.map((issue) => issue.message),
    ...composition.warnings.filter(
      (warning) => !preflight.issues.some((issue) => warning.includes(issue.message)),
    ),
  ];

  return (
    <div className="print-prototype-shell">
      <header className="print-prototype-toolbar">
        <div>
          <p className="print-toolbar-kicker">COMPOSIZIONE REALE</p>
          <h1>{edition?.title ?? issue.title}</h1>
        </div>
        <div className="print-toolbar-meta">
          <span>{composition.pages.length} pagine composte</span>
          <span>A4 · {issue.issueNumber}</span>
          <PrintPreviewActions />
        </div>
      </header>
      {preflightMessages.length > 0 ? (
        <div className="print-prototype-diagnostics" role="status">
          <strong>
            {preflight.blocking ? "Preflight bloccante" : `${preflightMessages.length} avvisi`}
          </strong>
          <span>{preflightMessages.join(" ")}</span>
        </div>
      ) : null}
      <main className="print-sheets print-composed-sheets">
        {composition.pages.map((page) => (
          <ComposedPage
            key={`${page.itemId}-${page.number}`}
            page={page}
            indexEntries={indexEntries}
          />
        ))}
      </main>
    </div>
  );
}
