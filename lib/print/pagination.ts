import type {
  PrintEditionManifest,
  PrintPaginationDiagnostic,
  PrintPaginationResult,
  PrintPlannedPage,
  PrintSequenceItem,
} from "@/lib/print/manifest";

/**
 * First deterministic planning pass for the print edition.
 *
 * This intentionally plans semantic page families instead of rendering text.
 * Real page geometry belongs to the renderer; this pass gives the preview and
 * preflight a stable sequence to work from.
 */
const WORDS_PER_TEXT_PAGE = 650;

function pagesForItem(item: PrintSequenceItem) {
  if (item.kind !== "article") return 1;
  return Math.max(1, Math.ceil(item.estimatedWords / WORDS_PER_TEXT_PAGE));
}

function addDiagnostic(
  diagnostics: PrintPaginationDiagnostic[],
  diagnostic: PrintPaginationDiagnostic,
) {
  diagnostics.push(diagnostic);
}

function planItem(
  item: PrintSequenceItem,
  page: number,
  diagnostics: PrintPaginationDiagnostic[],
): PrintPlannedPage[] {
  if (!item.title.trim()) {
    addDiagnostic(diagnostics, {
      severity: "error",
      code: "missing-title",
      itemId: item.id,
      message: "L'elemento di stampa non ha un titolo.",
    });
  }

  if (item.estimatedWords <= 0 && item.kind === "article") {
    addDiagnostic(diagnostics, {
      severity: "error",
      code: "empty-content",
      itemId: item.id,
      message: "L'articolo non contiene parole stimate per la composizione.",
    });
  }

  const pageCount = pagesForItem(item);
  const pages: PrintPlannedPage[] = [];

  for (let index = 0; index < pageCount; index += 1) {
    pages.push({
      page: page + index,
      family: index === 0 ? item.preferredFamily : "article-continuation",
      itemId: item.id,
      itemTitle: item.title,
      continuation: index > 0,
    });
  }

  const lastPageWords = item.estimatedWords % WORDS_PER_TEXT_PAGE;

  if (pageCount > 1 && lastPageWords > 0 && lastPageWords < 160) {
    addDiagnostic(diagnostics, {
      severity: "warning",
      code: "unbalanced-last-page",
      itemId: item.id,
      message: "L'ultima pagina dell'articolo potrebbe risultare troppo vuota.",
    });
  }

  return pages;
}

export function planPrintEdition(manifest: PrintEditionManifest): PrintPaginationResult {
  const diagnostics: PrintPaginationDiagnostic[] = [];
  const pages: PrintPlannedPage[] = [];
  let nextPage = 1;

  for (const item of manifest.items) {
    if (item.lockedPage !== undefined) {
      if (item.lockedPage < nextPage) {
        addDiagnostic(diagnostics, {
          severity: "error",
          code: "locked-page-conflict",
          itemId: item.id,
          message: `La pagina bloccata ${item.lockedPage} precede la posizione già pianificata ${nextPage}.`,
        });
      } else {
        nextPage = item.lockedPage;
      }
    }

    const itemPages = planItem(item, nextPage, diagnostics);
    pages.push(...itemPages);
    nextPage += itemPages.length;
  }

  return { pages, diagnostics };
}
