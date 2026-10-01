const PAGE_CONTAINER_SELECTOR = "[data-vivliostyle-page-container]";

export function formatPrintPageNumber(page: number) {
  return String(page).padStart(2, "0");
}

/** Maps every `data-print-anchor` to the first paginated page that contains it. */
export function collectAnchorPages(root: ParentNode) {
  const anchorPages = new Map<string, number>();

  root.querySelectorAll(PAGE_CONTAINER_SELECTOR).forEach((page, index) => {
    page.querySelectorAll("[data-print-anchor]").forEach((element) => {
      const anchor = element.getAttribute("data-print-anchor");
      if (anchor && !anchorPages.has(anchor)) anchorPages.set(anchor, index + 1);
    });
  });

  return anchorPages;
}

/**
 * Fills index and cover references after pagination. Folio widths are fixed in
 * the stylesheet, so replacing the digits never changes the layout.
 */
export function resolvePrintPageReferences(root: ParentNode) {
  const anchorPages = collectAnchorPages(root);

  root.querySelectorAll("[data-print-ref]").forEach((element) => {
    const page = anchorPages.get(element.getAttribute("data-print-ref") ?? "");
    element.textContent = page ? formatPrintPageNumber(page) : "--";
  });

  return root.querySelectorAll(PAGE_CONTAINER_SELECTOR).length;
}
