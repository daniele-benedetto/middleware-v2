"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { PrintPreviewActions } from "@/components/cms/print/print-preview-actions";
import {
  applyBackCoverFillers,
  countBackCoverFillers,
  countPrintPages,
  hasPrintBackCover,
} from "@/lib/print/back-cover-fill";
import { buildBookletPlan } from "@/lib/print/booklet";
import { acceptsClosingExpansion, nextClosingSection } from "@/lib/print/closing-pages";
import { collectEndLogoAnchors, placePrintEndLogos } from "@/lib/print/end-logo";
import { nextFitBudget, PRINT_FIT_MAX_PASSES } from "@/lib/print/fit";
import {
  applyFitBudgets,
  applyNudgeLevels,
  applyTightenLevels,
  collectFitSections,
  collectNudgeAnchors,
  collectTightenAnchors,
  fitPrintBoxes,
  measureArticleOpening,
  measureArticleTail,
  measureFitSection,
  measurePreviewQrGap,
  pagesWithAnchor,
} from "@/lib/print/fit-dom";
import { printFormat } from "@/lib/print/format";
import { nextNudge, startNudge, type PrintNudgeState } from "@/lib/print/nudge";
import { resolvePrintPageReferences } from "@/lib/print/page-references";
import { canExpandPreview, initialPreviewBudget } from "@/lib/print/preview-budget";
import { nextPreviewFill, startPreviewFill, type PreviewFillState } from "@/lib/print/preview-fill";
import { serializePrintSource } from "@/lib/print/print-source";
import { nextTighten, startTighten, type PrintTightenState } from "@/lib/print/tighten";

import type { PrintPreflightIssue } from "@/lib/print/preflight";
import type { PrintDarkTone } from "@/lib/print/theme";
import type { IssueHomeVariant } from "@/lib/server/modules/issues/schema";
import type { CoreViewer } from "@vivliostyle/core";

type PrintViewerStatus = "loading" | "ready" | "error";

type IssuePrintViewerProps = {
  issueId: string;
  variant: IssueHomeVariant;
  tone: PrintDarkTone | null;
  backCoverTone: PrintDarkTone | null;
  mode: "preview" | "pdf";
  preflight: PrintPreflightIssue[];
  children: ReactNode;
};

const MM_TO_PX = 96 / 25.4;
const PREVIEW_STAGE_PADDING_PX = 48;
// Long issues in a background tab are throttled by the browser: only flag a real stall.
const PAGINATION_TIMEOUT_MS = 180_000;

function toneStyle(tone: PrintDarkTone | null, backCoverTone: PrintDarkTone | null) {
  return {
    "--print-dark-bg": tone?.background ?? "#ffffff",
    "--print-dark-ink": tone?.ink ?? "#000000",
    "--print-dark-accent": tone?.accent ?? "#c13814",
    "--print-back-cover-bg": backCoverTone?.background ?? "#ffffff",
    "--print-back-cover-ink": backCoverTone?.ink ?? "#000000",
    "--print-back-cover-accent": backCoverTone?.accent ?? "#c13814",
  } as CSSProperties;
}

type CoreViewerConstructor = typeof CoreViewer;

function paginate(
  Viewer: CoreViewerConstructor,
  viewport: HTMLElement,
  printDocument: Document,
  isCancelled: () => boolean,
) {
  const host = document.createElement("div");
  host.className = "print-viewer__host";
  viewport.appendChild(host);
  const viewer = new Viewer({ viewportElement: host }, { renderAllPages: true, autoResize: false });

  return new Promise<{ host: HTMLElement; viewer: CoreViewer }>((resolve) => {
    viewer.addListener("readystatechange", () => {
      if (!isCancelled() && viewer.readyState === "complete") resolve({ host, viewer });
    });
    viewer.loadDocument({ url: window.location.href }, { documentObject: printDocument });
  });
}

/**
 * Lays the issue out with Vivliostyle. Sections that must fit into a number of
 * pages (courses, cut articles) are measured after each pass and their texts
 * trimmed, then the issue is laid out again with the same paginator.
 */
function usePrintPagination(variant: IssueHomeVariant) {
  const sourceRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<CoreViewer | null>(null);
  const [status, setStatus] = useState<PrintViewerStatus>("loading");
  const [pageCount, setPageCount] = useState(0);
  const [fillerCount, setFillerCount] = useState(0);
  const [recoveredPages, setRecoveredPages] = useState(0);
  const [previewPages, setPreviewPages] = useState(0);
  const [previewHasQr, setPreviewHasQr] = useState(false);
  const [paginationIssue, setPaginationIssue] = useState<string | null>(null);

  useEffect(() => {
    const source = sourceRef.current;
    const viewport = viewportRef.current;
    if (!source || !viewport) return;

    let cancelled = false;
    let current: HTMLElement | null = null;
    const isCancelled = () => cancelled;
    const timeout = window.setTimeout(() => {
      if (!cancelled) setStatus("error");
    }, PAGINATION_TIMEOUT_MS);

    const sections = collectFitSections(source);
    const previewAnchor = source.querySelector(".back-cover")?.getAttribute("data-print-anchor");
    const previewSection = sections.find((section) => section.anchor === previewAnchor);
    const previewLength = previewSection?.lengths.reduce((sum, length) => sum + length, 0) ?? 0;
    let hasPreviewQr = Boolean(
      previewAnchor && initialPreviewBudget(previewLength) < previewLength,
    );
    const pageLimits = new Map(sections.map((section) => [section.anchor, section.maxPages]));
    const attempted = new Set<string>();
    let recovered = 0;
    let previewFill: PreviewFillState | null = null;
    let previewFillFinished = false;
    let expansion: {
      anchor: string;
      budget: number;
      maxPages: number;
      pages: number;
      fillers: number;
    } | null = null;
    const tightenAnchors = collectTightenAnchors(source);
    const tightening = new Map<string, PrintTightenState>();
    const tightenLevels = new Map<string, number>();
    const nudgeAnchors = collectNudgeAnchors(source);
    const endLogoAnchors = collectEndLogoAnchors(source);
    const nudging = new Map<string, PrintNudgeState>();
    const nudgeLevels = new Map<string, number>();
    const backCover = hasPrintBackCover(source);
    let fillers = 0;
    const budgets = new Map(
      sections.map((section) => [
        section.anchor,
        section.lengths.reduce((total, length) => total + length, 0),
      ]),
    );
    if (previewAnchor && hasPreviewQr) {
      budgets.set(previewAnchor, initialPreviewBudget(previewLength));
    }

    async function run() {
      const { CoreViewer: Viewer } = await import("@vivliostyle/core");
      let settled = false;

      for (let pass = 1; pass <= PRINT_FIT_MAX_PASSES && !cancelled; pass += 1) {
        const working = source!.cloneNode(true) as HTMLElement;
        if (!hasPreviewQr) working.querySelector(".back-cover .print-footer-float")?.remove();
        applyFitBudgets(working, budgets);
        applyTightenLevels(working, tightenLevels);
        applyNudgeLevels(working, nudgeLevels);
        applyBackCoverFillers(working, fillers);
        const printDocument = new DOMParser().parseFromString(
          serializePrintSource(working, variant, window.location.origin),
          "text/html",
        );

        current?.remove();
        const result = await paginate(Viewer, viewport!, printDocument, isCancelled);
        if (cancelled) return;
        current = result.host;
        viewerRef.current = result.viewer;

        let changed = false;
        if (pass < PRINT_FIT_MAX_PASSES) {
          for (const section of sections) {
            if (section.anchor === previewAnchor && !hasPreviewQr) continue;
            if (section.anchor === previewAnchor && previewFill) continue;
            const next = nextFitBudget(
              measureFitSection(result.host, {
                anchor: section.anchor,
                maxPages: pageLimits.get(section.anchor) ?? section.maxPages,
              }),
              pageLimits.get(section.anchor) ?? section.maxPages,
              budgets.get(section.anchor) ?? 0,
            );
            if (next !== null) {
              budgets.set(section.anchor, next);
              changed = true;
            }
          }

          for (const anchor of nudgeAnchors) {
            const opening = measureArticleOpening(result.host, anchor);
            const previous = nudging.get(anchor);
            const next = previous ? nextNudge(previous, opening) : startNudge(opening);
            nudging.set(anchor, next);
            if (next.level !== (nudgeLevels.get(anchor) ?? 0)) {
              nudgeLevels.set(anchor, next.level);
              changed = true;
            }
          }

          for (const anchor of tightenAnchors) {
            const measure = measureArticleTail(result.host, anchor);
            const previous = tightening.get(anchor);
            const next = previous ? nextTighten(previous, measure) : startTighten(measure);
            tightening.set(anchor, next);
            if (next.level !== (tightenLevels.get(anchor) ?? 0)) {
              tightenLevels.set(anchor, next.level);
              changed = true;
            }
          }

          if (backCover && !previewFill) {
            const next = countBackCoverFillers(countPrintPages(result.host), fillers);
            if (next !== fillers) {
              fillers = next;
              changed = true;
            }
          }

          // Reuse spare leaves for actual omitted prose, starting with the
          // latest cut article. A trial is committed only after a stable render
          // consumes exactly one blank and gives it a meaningful amount of text.
          const available = backCover
            ? fillers
            : buildBookletPlan(countPrintPages(result.host)).paddedPageCount -
              countPrintPages(result.host);

          // A complete article has nothing to continue online. Removing its QR
          // must trigger another pass so the final page and booklet are measured again.
          if (
            !changed &&
            hasPreviewQr &&
            previewAnchor &&
            (budgets.get(previewAnchor) ?? 0) >= previewLength
          ) {
            hasPreviewQr = false;
            changed = true;
          }

          if (!changed && expansion) {
            const afterPages = pagesWithAnchor(result.host, expansion.anchor).length;
            const tailLines = measureArticleTail(result.host, expansion.anchor).tailLines;
            const accepted = acceptsClosingExpansion({
              beforePages: expansion.pages,
              afterPages,
              beforeFillers: expansion.fillers,
              afterFillers: available,
              tailLines,
            });
            if (accepted) {
              if (expansion.anchor === previewAnchor) {
                if ((pageLimits.get(expansion.anchor) ?? 1) < 4) {
                  attempted.delete(expansion.anchor);
                }
              } else {
                recovered += 1;
              }
            } else {
              budgets.set(expansion.anchor, expansion.budget);
              pageLimits.set(expansion.anchor, expansion.maxPages);
              if (expansion.anchor === previewAnchor) {
                hasPreviewQr = false;
                budgets.set(expansion.anchor, previewLength);
              }
              changed = true;
            }
            expansion = null;
          }

          if (!changed && previewFill && previewAnchor) {
            const measure = measureFitSection(result.host, {
              anchor: previewAnchor,
              maxPages: pageLimits.get(previewAnchor) ?? 1,
            });
            const next = nextPreviewFill(previewFill, {
              fits: measure.pageCount <= (pageLimits.get(previewAnchor) ?? 1),
              gapLines: measurePreviewQrGap(result.host, previewAnchor),
            });
            previewFill = next.state;
            if (next.budget !== null) {
              budgets.set(previewAnchor, next.budget);
              changed = true;
            } else {
              previewFillFinished = true;
            }
          }

          if (
            !changed &&
            !previewFill &&
            !previewFillFinished &&
            !expansion &&
            available === 0 &&
            hasPreviewQr &&
            previewAnchor &&
            pass < PRINT_FIT_MAX_PASSES - 10
          ) {
            previewFill = startPreviewFill(
              budgets.get(previewAnchor) ?? 0,
              initialPreviewBudget(previewLength),
            );
            if (previewFill) {
              budgets.set(previewAnchor, previewFill.current);
              changed = true;
            } else {
              previewFillFinished = true;
            }
          }

          if (!changed && !expansion && available > 0 && pass < PRINT_FIT_MAX_PASSES - 4) {
            const candidate = nextClosingSection(sections, budgets, attempted);
            if (candidate) {
              if (
                candidate.anchor === previewAnchor &&
                !canExpandPreview(previewLength, budgets.get(candidate.anchor) ?? 0)
              ) {
                hasPreviewQr = false;
                budgets.set(candidate.anchor, previewLength);
                attempted.add(candidate.anchor);
                changed = true;
                continue;
              }
              attempted.add(candidate.anchor);
              expansion = {
                anchor: candidate.anchor,
                budget: budgets.get(candidate.anchor) ?? 0,
                maxPages: pageLimits.get(candidate.anchor) ?? candidate.maxPages,
                pages: pagesWithAnchor(result.host, candidate.anchor).length,
                fillers: available,
              };
              pageLimits.set(candidate.anchor, expansion.maxPages + 1);
              const originalLength = candidate.lengths.reduce((sum, length) => sum + length, 0);
              budgets.set(
                candidate.anchor,
                Math.min(
                  candidate.anchor === previewAnchor
                    ? initialPreviewBudget(originalLength)
                    : originalLength,
                  Math.ceil(expansion.budget * (candidate.anchor === previewAnchor ? 2.2 : 1.5)),
                ),
              );
              changed = true;
            }
          }
        }
        if (!changed) {
          settled = true;
          break;
        }
      }

      if (cancelled || !current) return;
      if (!settled || expansion || previewFill) {
        setStatus("error");
        return;
      }
      if (backCover && fillers > 0) {
        window.clearTimeout(timeout);
        setPaginationIssue(
          `Mancano contenuti per sostituire ${countBlankPages(fillers)}: aggiungi testo stampabile al numero.`,
        );
        setStatus("error");
        return;
      }
      window.clearTimeout(timeout);
      fitPrintBoxes(current);
      placePrintEndLogos(current, endLogoAnchors);
      if (previewAnchor) {
        setPreviewPages(pagesWithAnchor(current, previewAnchor).length);
        setPreviewHasQr(hasPreviewQr);
      }
      setPageCount(resolvePrintPageReferences(current));
      setFillerCount(fillers);
      setRecoveredPages(recovered);
      setStatus("ready");
    }

    run().catch(() => {
      if (!cancelled) setStatus("error");
    });

    return () => {
      cancelled = true;
      viewerRef.current = null;
      window.clearTimeout(timeout);
      viewport.querySelectorAll(".print-viewer__host").forEach((host) => host.remove());
    };
  }, [variant]);

  return {
    sourceRef,
    viewportRef,
    viewerRef,
    status,
    pageCount,
    fillerCount,
    recoveredPages,
    previewPages,
    previewHasQr,
    paginationIssue,
  };
}

/**
 * Fits pages to the stage height through Vivliostyle's own zoom option: a CSS
 * zoom or transform on the host would distort the paginator's measurements.
 * Vivliostyle emulates a high pixel ratio with zoom + transform, so the scroll
 * area is clipped to the pages' visual box.
 */
function usePreviewZoom(
  viewerRef: { current: CoreViewer | null },
  viewportRef: { current: HTMLDivElement | null },
  status: PrintViewerStatus,
  pageHeightMm: number,
) {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const viewport = viewportRef.current;
    if (status !== "ready" || !stage || !viewport) return;

    let frame = 0;
    const clipToPages = () => {
      const spread = viewport.querySelector("[data-vivliostyle-spread-container]");
      if (!spread) return;
      const { width, height } = spread.getBoundingClientRect();
      viewport.style.width = `${Math.ceil(width)}px`;
      viewport.style.height = `${Math.ceil(height)}px`;
    };
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const available = entry.contentRect.height - PREVIEW_STAGE_PADDING_PX;
      viewerRef.current?.setOptions({
        zoom: Math.max(0.2, Math.min(1, available / (pageHeightMm * MM_TO_PX))),
      });
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(clipToPages);
      });
    });
    observer.observe(stage);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [viewerRef, viewportRef, status, pageHeightMm]);

  return stageRef;
}

function countBlankPages(count: number) {
  return `${count} ${count === 1 ? "pagina bianca" : "pagine bianche"}`;
}

function describePagination(
  pageCount: number,
  fillerCount: number,
  recoveredPages: number,
  previewPages: number,
  previewHasQr: boolean,
) {
  const { pageLabel, sheetLabel } = printFormat;
  const booklet = buildBookletPlan(pageCount);
  const blankPages = booklet.paddedPageCount - pageCount;
  const sheets = booklet.sheets.length;

  return [
    `${pageCount} pagine ${pageLabel}`,
    `${sheets} ${sheets === 1 ? "foglio" : "fogli"} ${sheetLabel}`,
    previewPages > 0
      ? `Anticipazione: ${previewPages} ${previewPages === 1 ? "pagina" : "pagine"} · ${previewHasQr ? "continua online" : "testo integrale"}`
      : null,
    recoveredPages > 0
      ? `${recoveredPages} ${recoveredPages === 1 ? "pagina recuperata" : "pagine recuperate"} per il testo`
      : null,
    fillerCount > 0 ? `${countBlankPages(fillerCount)} prima della quarta` : null,
    blankPages > 0 ? `${countBlankPages(blankPages)} in coda` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function IssuePrintViewer({
  issueId,
  variant,
  tone,
  backCoverTone,
  mode,
  preflight,
  children,
}: IssuePrintViewerProps) {
  const {
    sourceRef,
    viewportRef,
    viewerRef,
    status,
    pageCount,
    fillerCount,
    recoveredPages,
    previewPages,
    previewHasQr,
    paginationIssue,
  } = usePrintPagination(variant);
  const stageRef = usePreviewZoom(
    viewerRef,
    viewportRef,
    mode === "preview" ? status : "loading",
    printFormat.page.heightMm,
  );
  // Both outputs paginate under the same host CSS; PDF switches to its print
  // frame only after Vivliostyle has finished laying out the page boxes.
  const frameMode = status === "ready" ? mode : "preview";

  return (
    <div
      className={`print-viewer print-viewer--${frameMode}`}
      data-print-status={status}
      style={toneStyle(tone, backCoverTone)}
    >
      <div ref={sourceRef} hidden>
        {children}
      </div>

      {mode === "preview" ? (
        <header className="print-viewer__toolbar">
          <div className="min-w-0 space-y-1">
            <p className="font-ui text-[12px] font-bold tracking-[0.08em] uppercase">
              Anteprima cartacea
              <span className="ml-3 font-semibold tracking-normal normal-case text-muted-foreground">
                {status === "ready"
                  ? describePagination(
                      pageCount,
                      fillerCount,
                      recoveredPages,
                      previewPages,
                      previewHasQr,
                    )
                  : status === "error"
                    ? (paginationIssue ?? "Impaginazione non riuscita")
                    : "Impaginazione in corso…"}
              </span>
            </p>
            {preflight.length > 0 ? (
              <ul className="font-ui text-[12px] text-accent">
                {preflight.map((issue) => (
                  <li key={`${issue.code}-${issue.message}`}>{issue.message}</li>
                ))}
              </ul>
            ) : null}
          </div>
          <PrintPreviewActions issueId={issueId} disabled={status !== "ready"} />
        </header>
      ) : null}

      <div ref={stageRef} className="print-viewer__stage">
        <div ref={viewportRef} className="print-viewer__pages" />
      </div>
    </div>
  );
}
