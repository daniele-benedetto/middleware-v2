import { PAGES_PER_SHEET } from "@/lib/print/booklet";

const BACK_COVER_SELECTOR = ".back-cover";
const PAGE_CONTAINER_SELECTOR = "[data-vivliostyle-page-container]";

export function hasPrintBackCover(source: ParentNode) {
  return source.querySelector(BACK_COVER_SELECTOR) !== null;
}

/**
 * Blank pages to add before the back cover so the booklet is a whole number of
 * sheets and closes on it: from 0 to 3, whatever was added in the last pass.
 */
export function countBackCoverFillers(pageCount: number, currentFillers: number) {
  const pagesWithoutFillers = pageCount - currentFillers;
  return (PAGES_PER_SHEET - (pagesWithoutFillers % PAGES_PER_SHEET)) % PAGES_PER_SHEET;
}

export function countPrintPages(rendered: ParentNode) {
  return rendered.querySelectorAll(PAGE_CONTAINER_SELECTOR).length;
}

/** Empty pages (`.print-filler` in issue.css) right before the back cover. */
export function applyBackCoverFillers(root: ParentNode, count: number) {
  const backCover = root.querySelector(BACK_COVER_SELECTOR);
  if (!backCover) return;

  for (let index = 0; index < count; index += 1) {
    const filler = backCover.ownerDocument.createElement("div");
    filler.className = "print-filler";
    filler.setAttribute("aria-hidden", "true");
    backCover.before(filler);
  }
}
