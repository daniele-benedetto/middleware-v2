import Image from "next/image";

import { extractPrintParagraphs } from "@/lib/print/content";
import { buildPrintEditionManifest } from "@/lib/print/issue-manifest";
import { planPrintEdition } from "@/lib/print/pagination";
import { extractPlainText } from "@/lib/rich-text/plain-text";

export type PrintIssuePreviewSource = {
  issueId: string;
  issueNumber: string;
  title: string;
  description: unknown;
  articles: Array<{
    id: string;
    title: string;
    excerpt: string | null;
    authorName: string | null;
    readingTimeMinutes: number;
    contentRich: unknown;
  }>;
  courses?: Array<{
    id: string;
    title: string;
    description: unknown;
    lessons: Array<{ title: string; readingTimeMinutes: number }>;
  }>;
  maps?: Array<{
    id: string;
    title: string;
    descriptionRich: unknown;
    items: Array<{ title: string }>;
  }>;
  questionnaireAnalyses?: Array<{
    id: string;
    title: string;
    descriptionRich: unknown;
    fields: Array<{ label: string }>;
  }>;
  homeBlocks?: Array<
    | { type: "opening" | "body" | "rupture" | "closing"; articleIds: string[] }
    | { type: "course"; courseId: string | null }
    | { type: "map"; mapId: string | null }
    | { type: "questionnaireAnalysis"; questionnaireId: string | null }
    | { type: "preview"; previewIssueId: string | null }
  >;
};

const prototypePages = [
  { number: "01", label: "COVER", family: "cover" },
  { number: "02", label: "INDEX", family: "index" },
  { number: "03", label: "ISSUE OPENER", family: "issue-opener" },
  { number: "04", label: "ARTICLE OPENER", family: "article-opener" },
  { number: "05", label: "TEXT SPREAD", family: "text-spread" },
  { number: "06", label: "RUPTURE", family: "rupture" },
  { number: "07", label: "MAP PLATE", family: "map-plate" },
  { number: "08", label: "COURSE SECTION", family: "course-section" },
  { number: "09", label: "ANALYSIS", family: "questionnaire-analysis" },
  { number: "10", label: "CLOSING", family: "closing" },
] as const;

function PrintPage({
  number,
  children,
  tone = "paper",
}: {
  number: string;
  children: React.ReactNode;
  tone?: "paper" | "white" | "ink";
}) {
  return (
    <article className={`print-sheet print-sheet--${tone}`} aria-label={`Pagina ${number}`}>
      <span className="print-sheet__folio">{number}</span>
      {children}
    </article>
  );
}

function MetaLine({ children }: { children: React.ReactNode }) {
  return <p className="print-meta-line">{children}</p>;
}

function ArticleIndexRow({ number, title, page }: { number: string; title: string; page: string }) {
  return (
    <li className="print-index-row">
      <span className="print-index-row__number">{number}</span>
      <span className="print-index-row__title">{title}</span>
      <span className="print-index-row__page">{page}</span>
    </li>
  );
}

export function PrintPrototype({ issue }: { issue?: PrintIssuePreviewSource }) {
  const issueTitle = issue?.title ?? "Il lavoro";
  const issueDescription =
    extractPlainText(issue?.description) ||
    "Un dossier su tempo, disciplina, cura e sulle forme che il lavoro assume quando smette di essere soltanto una prestazione.";
  const leadArticle = issue?.articles[0];
  const course = issue?.courses?.[0];
  const map = issue?.maps?.[0];
  const questionnaireAnalysis = issue?.questionnaireAnalyses?.[0];
  const pagination = issue
    ? planPrintEdition(
        buildPrintEditionManifest({
          issueId: issue.issueId,
          issueNumber: issue.issueNumber,
          title: issue.title,
          articles: issue.articles,
          courses: issue.courses,
          maps: issue.maps,
          questionnaireAnalyses: issue.questionnaireAnalyses,
          homeBlocks: issue.homeBlocks,
        }),
      )
    : null;
  const leadParagraphs = leadArticle ? extractPrintParagraphs(leadArticle.contentRich) : [];
  const printParagraphs =
    leadParagraphs.length > 0
      ? leadParagraphs
      : [
          "La prima cosa che impariamo del lavoro è che deve produrre un risultato. La seconda è che il risultato deve essere visibile. Tutto il resto — l’attesa, la ripetizione, l’attenzione — viene trattato come tempo laterale.",
          "La giornata lavorativa ha un inizio e una fine soltanto quando la si osserva da lontano. Da vicino è fatta di soglie, preparazioni e piccole sospensioni.",
          "La parte più invisibile di un mestiere è spesso quella che ne determina la qualità. Non entra nella lista delle consegne, non occupa il calendario, non produce una prova immediata.",
          "Il tempo non è solo la superficie che contiene le cose. È una materia che si può consumare, dividere, proteggere.",
        ];

  return (
    <div className="print-prototype-shell">
      <header className="print-prototype-toolbar">
        <div>
          <p className="print-toolbar-kicker">PROTOTIPO EDITORIALE</p>
          <h1>Il lavoro / numero campione</h1>
        </div>
        <div className="print-toolbar-meta">
          <span>{pagination?.pages.length ?? 10} pagine stimate</span>
          <span>A4 · Archive Paper · PDF</span>
        </div>
      </header>

      <div className="print-prototype-note">
        <strong>Riferimento grafico.</strong> Contenuti dimostrativi per verificare ritmo, gerarchie
        e famiglie di pagina prima del collegamento ai dati reali.
      </div>

      {pagination && pagination.diagnostics.length > 0 ? (
        <div className="print-prototype-diagnostics" role="status">
          <strong>{pagination.diagnostics.length} avvisi di impaginazione</strong>
          <span>{pagination.diagnostics.map((diagnostic) => diagnostic.message).join(" ")}</span>
        </div>
      ) : null}

      <div className="print-page-index" aria-label="Famiglie di pagina incluse nel prototipo">
        {prototypePages.map((page) => (
          <a key={page.number} href={`#print-page-${page.number}`}>
            <span>{page.number}</span>
            <small>{page.label}</small>
          </a>
        ))}
      </div>

      <main className="print-sheets" id="print-preview">
        <div id="print-page-01">
          <PrintPage number="01" tone="ink">
            <div className="print-cover-mark">MW / {issue?.issueNumber ?? "01"}</div>
            <div className="print-cover-title">
              {issue ? (
                <span>{issueTitle}</span>
              ) : (
                <>
                  <span>Il</span>
                  <span>lavoro</span>
                </>
              )}
            </div>
            <div className="print-cover-rule" />
            <p className="print-cover-description">{issueDescription}</p>
            <Image
              src="/brand/middleware-pictogram-cream.png"
              alt="Pittogramma Middleware"
              width={320}
              height={320}
              className="print-cover-image"
              priority
            />
            <div className="print-cover-footer">
              <span>MIDDLEWARE</span>
              <span>{issue?.issueNumber ?? "PRIMAVERA 2026"}</span>
            </div>
          </PrintPage>
        </div>

        <div id="print-page-02">
          <PrintPage number="02" tone="white">
            <div className="print-page-header">
              <span>MIDDLEWARE</span>
              <span>IL LAVORO / 01</span>
            </div>
            <div className="print-index-layout">
              <div>
                <p className="print-section-label">INDICE</p>
                <h2>
                  Una mappa
                  <br />
                  del numero.
                </h2>
                <p className="print-lead-copy">{issueDescription}</p>
              </div>
              <ol className="print-index-list">
                {(
                  issue?.articles ?? [
                    { title: "La giornata non basta" },
                    { title: "Il mestiere della cura" },
                    { title: "Quando il lavoro cambia stanza" },
                    { title: "Cartografia dell’attesa" },
                    { title: "Imparare a fare bene" },
                    { title: "Le risposte non sono neutre" },
                  ]
                ).map((article, index) => (
                  <ArticleIndexRow
                    key={`${article.title}-${index}`}
                    number={String(index + 1).padStart(2, "0")}
                    title={article.title}
                    page={String(4 + index).padStart(2, "0")}
                  />
                ))}
              </ol>
            </div>
            <div className="print-bottom-note">DOSSIER / SAGGIO / MAPPA / FORMAZIONE / DATI</div>
          </PrintPage>
        </div>

        <div id="print-page-03">
          <PrintPage number="03">
            <div className="print-opener-topline">
              <span>NUMERO 01</span>
              <span>PRIMAVERA 2026</span>
            </div>
            <div className="print-issue-opener">
              <p className="print-section-label">UN DOSSIER MIDDLEWARE</p>
              <h2>
                {issue ? (
                  issueTitle
                ) : (
                  <>
                    Il lavoro
                    <br />
                    che resta.
                  </>
                )}
              </h2>
              <p className="print-issue-deck">{issueDescription}</p>
              <div className="print-opener-stamp">01</div>
            </div>
            <div className="print-issue-meta-grid">
              <MetaLine>06 ARTICOLI</MetaLine>
              <MetaLine>01 MAPPA</MetaLine>
              <MetaLine>01 PERCORSO</MetaLine>
              <MetaLine>42 MINUTI DI LETTURA</MetaLine>
            </div>
          </PrintPage>
        </div>

        <div id="print-page-04">
          <PrintPage number="04" tone="white">
            <div className="print-page-header">
              <span>01 / APERTURA</span>
              <span>IL LAVORO / 01</span>
            </div>
            <div className="print-article-opener">
              <div>
                <span className="print-article-number">01</span>
                <p className="print-section-label">SAGGIO</p>
                <h2>
                  {leadArticle?.title ?? (
                    <>
                      La giornata
                      <br />
                      non basta
                    </>
                  )}
                </h2>
                <p className="print-article-deck">
                  {leadArticle?.excerpt ??
                    "Il tempo del lavoro non coincide più con quello che vediamo sull’orologio. Tra una cosa fatta e una cosa finita esiste una zona molto più larga."}
                </p>
              </div>
              <div className="print-article-details">
                <MetaLine>{leadArticle?.authorName ?? "AUTORE DIMOSTRATIVO"}</MetaLine>
                <MetaLine>
                  {leadArticle ? `${leadArticle.readingTimeMinutes} MINUTI` : "12 MINUTI"}
                </MetaLine>
                <MetaLine>TESTO INTEGRALE</MetaLine>
              </div>
            </div>
            <div className="print-article-opening-rule" />
            <p className="print-opening-paragraph">
              La prima cosa che impariamo del lavoro è che deve produrre un risultato. La seconda è
              che il risultato deve essere visibile. Tutto il resto — l’attesa, la ripetizione,
              l’attenzione — viene trattato come tempo laterale.
            </p>
          </PrintPage>
        </div>

        <div id="print-page-05">
          <PrintPage number="05">
            <div className="print-page-header">
              <span>01 / LA GIORNATA NON BASTA</span>
              <span>04—05</span>
            </div>
            <div className="print-text-spread">
              <div className="print-text-column">
                <p className="print-dropcap">L</p>
                {printParagraphs.slice(0, 2).map((paragraph, index) => (
                  <p key={`${paragraph}-${index}`}>{paragraph}</p>
                ))}
              </div>
              <aside className="print-margin-quote">
                <span>APPUNTO 01</span>
                <blockquote>
                  “Fare bene significa spesso preparare ciò che nessuno vedrà.”
                </blockquote>
                <small>— DALLE NOTE DELL’INTERVISTA</small>
              </aside>
              <div className="print-text-column">
                {printParagraphs.slice(2, 4).map((paragraph, index) => (
                  <p key={`${paragraph}-${index}`}>{paragraph}</p>
                ))}
              </div>
            </div>
            <div className="print-page-footer">MIDDLEWARE / TESTO INTEGRALE</div>
          </PrintPage>
        </div>

        <div id="print-page-06">
          <PrintPage number="06" tone="ink">
            <div className="print-rupture-number">03</div>
            <div className="print-rupture-copy">
              <p className="print-section-label">ROTTURA</p>
              <h2>
                Quando il lavoro
                <br />
                cambia stanza
              </h2>
              <p>
                Una pagina di passaggio. Un articolo che interrompe la continuità del dossier e
                sposta il punto di vista dal tempo individuale allo spazio condiviso.
              </p>
            </div>
            <div className="print-rupture-lines" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
          </PrintPage>
        </div>

        <div id="print-page-07">
          <PrintPage number="07" tone="white">
            <div className="print-page-header">
              <span>04 / CARTOGRAFIA DELL’ATTESA</span>
              <span>MAP PLATE</span>
            </div>
            <div className="print-map-layout">
              <div className="print-map-plate" aria-label="Tavola cartografica dimostrativa">
                <span className="print-map-axis print-map-axis--x">01—06—12—18—24</span>
                <span className="print-map-axis print-map-axis--y">A</span>
                <span className="print-map-point print-map-point--one">01</span>
                <span className="print-map-point print-map-point--two">02</span>
                <span className="print-map-point print-map-point--three">03</span>
                <span className="print-map-path" />
              </div>
              <div className="print-map-caption">
                <p className="print-section-label">TAVOLA 01</p>
                <h2>
                  {map?.title ?? (
                    <>
                      Cartografia
                      <br />
                      dell’attesa
                    </>
                  )}
                </h2>
                <p>
                  {extractPlainText(map?.descriptionRich) ||
                    "Tre luoghi in cui il lavoro comincia prima di essere riconosciuto come tale."}
                </p>
                <ol>
                  {(
                    map?.items ?? [
                      { title: "Soglia" },
                      { title: "Intervallo" },
                      { title: "Ritorno" },
                    ]
                  )
                    .slice(0, 5)
                    .map((item, index) => (
                      <li key={`${item.title}-${index}`}>
                        <b>{String(index + 1).padStart(2, "0")}</b> {item.title}
                      </li>
                    ))}
                </ol>
              </div>
            </div>
          </PrintPage>
        </div>

        <div id="print-page-08">
          <PrintPage number="08">
            <div className="print-page-header">
              <span>FORMAZIONE / 01</span>
              <span>LEZIONE 01—04</span>
            </div>
            <div className="print-course-layout">
              <div>
                <p className="print-section-label">CONTRO-FORMAZIONE</p>
                <h2>
                  {course?.title ?? (
                    <>
                      Imparare
                      <br />a fare bene
                    </>
                  )}
                </h2>
                <p className="print-lead-copy">
                  {extractPlainText(course?.description) ||
                    "Un percorso in quattro lezioni per osservare la qualità prima del risultato e costruire strumenti di attenzione condivisa."}
                </p>
              </div>
              <ol className="print-lesson-list">
                {(
                  course?.lessons ?? [
                    { title: "La misura del gesto", readingTimeMinutes: 12 },
                    { title: "Ripetere senza automatismo", readingTimeMinutes: 18 },
                    { title: "Il lavoro degli altri", readingTimeMinutes: 15 },
                    { title: "Una pratica comune", readingTimeMinutes: 21 },
                  ]
                )
                  .slice(0, 6)
                  .map((lesson, index) => (
                    <li key={`${lesson.title}-${index}`}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <b>{lesson.title}</b>
                      <small>{lesson.readingTimeMinutes} min</small>
                    </li>
                  ))}
              </ol>
            </div>
            <div className="print-course-footer">CORSO / 04 LEZIONI / AUDIO DISPONIBILE ONLINE</div>
          </PrintPage>
        </div>

        <div id="print-page-09">
          <PrintPage number="09" tone="white">
            <div className="print-page-header">
              <span>DATI / ANALISI</span>
              <span>06 / LE RISPOSTE NON SONO NEUTRE</span>
            </div>
            <div className="print-analysis-layout">
              <div>
                <p className="print-section-label">QUESTIONARIO</p>
                <h2>
                  {questionnaireAnalysis?.title ?? (
                    <>
                      Le risposte
                      <br />
                      non sono neutre
                    </>
                  )}
                </h2>
                <p className="print-lead-copy">
                  {extractPlainText(questionnaireAnalysis?.descriptionRich) ||
                    "Cosa viene considerato lavoro quando nessuno assegna un compito? Una lettura dei risultati raccolti dalla redazione."}
                </p>
              </div>
              <div className="print-chart" aria-label="Grafico dimostrativo delle risposte">
                {(
                  questionnaireAnalysis?.fields ?? [
                    { label: "cura" },
                    { label: "attesa" },
                    { label: "riposo" },
                    { label: "errore" },
                  ]
                )
                  .slice(0, 4)
                  .map((field, index) => {
                    const height = `${82 - index * 17}%`;
                    return (
                      <div key={`${field.label}-${index}`}>
                        <span style={{ height }} />
                        <b>{height}</b>
                        <small>{field.label}</small>
                      </div>
                    );
                  })}
              </div>
            </div>
            <div className="print-analysis-source">
              CAMPIONE EDITORIALE / DATI DIMOSTRATIVI / 2026
            </div>
          </PrintPage>
        </div>

        <div id="print-page-10">
          <PrintPage number="10" tone="ink">
            <div className="print-closing-layout">
              <div>
                <p className="print-section-label">FINE DEL DOSSIER</p>
                <h2>
                  Il lavoro
                  <br />
                  che resta.
                </h2>
              </div>
              <p>
                Questo numero non chiude il tema. Lo lascia in una forma abbastanza precisa da poter
                essere ripreso, discusso, contraddetto.
              </p>
              <div className="print-closing-mark">
                MIDDLEWARE
                <br />
                <span>01 / 2026</span>
              </div>
            </div>
          </PrintPage>
        </div>
      </main>
    </div>
  );
}
