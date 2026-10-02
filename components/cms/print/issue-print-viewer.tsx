"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { PrintPreviewActions } from "@/components/cms/print/print-preview-actions";
import { buildBookletPlan } from "@/lib/print/booklet";
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
} from "@/lib/print/fit-dom";
import { printFormats, type PrintFormat } from "@/lib/print/format";
import { nextNudge, startNudge, type PrintNudgeState } from "@/lib/print/nudge";
import { resolvePrintPageReferences } from "@/lib/print/page-references";
import { serializePrintSource } from "@/lib/print/print-source";
import { nextTighten, startTighten, type PrintTightenState } from "@/lib/print/tighten";

import type { PrintPreflightIssue } from "@/lib/print/preflight";
import type { PrintDarkTone } from "@/lib/print/theme";
import type { IssueHomeVariant } from "@/lib/server/modules/issues/schema";
import type { CoreViewer } from "@vivliostyle/core";

type PrintViewerStatus = "loading" | "ready" | "error";

type IssuePrintViewerProps = {
  issueId: string;
  format: PrintFormat;
  variant: IssueHomeVariant;
  tone: PrintDarkTone | null;
  mode: "preview" | "pdf";
  preflight: PrintPreflightIssue[];
  children: ReactNode;
};

const MM_TO_PX = 96 / 25.4;
const PREVIEW_STAGE_PADDING_PX = 48;
// Long issues in a background tab are throttled by the browser: only flag a real stall.
const PAGINATION_TIMEOUT_MS = 180_000;

function toneStyle(tone: PrintDarkTone | null) {
  return {
    "--print-dark-bg": tone?.background ?? "#ffffff",
    "--print-dark-ink": tone?.ink ?? "#000000",
    "--print-dark-accent": tone?.accent ?? "#c13814",
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
function usePrintPagination(variant: IssueHomeVariant, format: PrintFormat) {
  const sourceRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<CoreViewer | null>(null);
  const [status, setStatus] = useState<PrintViewerStatus>("loading");
  const [pageCount, setPageCount] = useState(0);

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
    const tightenAnchors = collectTightenAnchors(source);
    const tightening = new Map<string, PrintTightenState>();
    const tightenLevels = new Map<string, number>();
    const nudgeAnchors = collectNudgeAnchors(source);
    const endLogoAnchors = collectEndLogoAnchors(source);
    const nudging = new Map<string, PrintNudgeState>();
    const nudgeLevels = new Map<string, number>();
    const budgets = new Map(
      sections.map((section) => [
        section.anchor,
        section.lengths.reduce((total, length) => total + length, 0),
      ]),
    );

    async function run() {
      const { CoreViewer: Viewer } = await import("@vivliostyle/core");

      for (let pass = 1; pass <= PRINT_FIT_MAX_PASSES && !cancelled; pass += 1) {
        const working = source!.cloneNode(true) as HTMLElement;
        applyFitBudgets(working, budgets);
        applyTightenLevels(working, tightenLevels);
        applyNudgeLevels(working, nudgeLevels);
        const printDocument = new DOMParser().parseFromString(
          serializePrintSource(working, variant, format, window.location.origin),
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
            const next = nextFitBudget(
              measureFitSection(result.host, section),
              section.maxPages,
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
        }
        if (!changed) break;
      }

      if (cancelled || !current) return;
      window.clearTimeout(timeout);
      fitPrintBoxes(current);
      placePrintEndLogos(current, endLogoAnchors);
      setPageCount(resolvePrintPageReferences(current));
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
  }, [variant, format]);

  return { sourceRef, viewportRef, viewerRef, status, pageCount };
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

function describePagination(pageCount: number, format: PrintFormat) {
  const { pageLabel, sheetLabel } = printFormats[format];
  const booklet = buildBookletPlan(pageCount);
  const blankPages = booklet.paddedPageCount - pageCount;
  const sheets = booklet.sheets.length;

  return [
    `${pageCount} pagine ${pageLabel}`,
    `${sheets} ${sheets === 1 ? "foglio" : "fogli"} ${sheetLabel}`,
    blankPages > 0
      ? `${blankPages} ${blankPages === 1 ? "pagina bianca" : "pagine bianche"} in coda`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function IssuePrintViewer({
  issueId,
  format,
  variant,
  tone,
  mode,
  preflight,
  children,
}: IssuePrintViewerProps) {
  const { sourceRef, viewportRef, viewerRef, status, pageCount } = usePrintPagination(
    variant,
    format,
  );
  const stageRef = usePreviewZoom(
    viewerRef,
    viewportRef,
    mode === "preview" ? status : "loading",
    printFormats[format].page.heightMm,
  );

  return (
    <div
      className={`print-viewer print-viewer--${mode}`}
      data-print-status={status}
      style={toneStyle(tone)}
    >
      <div ref={sourceRef} hidden>
        {children}
      </div>

      {mode === "preview" ? (
        <header className="print-viewer__toolbar">
          <div className="min-w-0 space-y-1">
            <p className="font-ui text-[12px] font-bold tracking-[0.08em] uppercase">
              Preview cartacea
              <span className="ml-3 font-semibold tracking-normal normal-case text-muted-foreground">
                {status === "ready"
                  ? describePagination(pageCount, format)
                  : status === "error"
                    ? "Impaginazione non riuscita"
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
          <PrintPreviewActions issueId={issueId} format={format} disabled={status !== "ready"} />
        </header>
      ) : null}

      <div ref={stageRef} className="print-viewer__stage">
        <div ref={viewportRef} className="print-viewer__pages" />
      </div>
    </div>
  );
}
