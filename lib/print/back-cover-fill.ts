import { PAGES_PER_SHEET } from "@/lib/print/booklet";

const BACK_COVER_SELECTOR = ".back-cover";
const PAGE_CONTAINER_SELECTOR = "[data-vivliostyle-page-container]";

export function hasPrintBackCover(source: ParentNode) {
  return source.querySelector(BACK_COVER_SELECTOR) !== null;
}

export function countBackCoverFillers(pageCount: number, currentFillers: number) {
  const pagesWithoutFillers = pageCount - currentFillers;
  return (PAGES_PER_SHEET - (pagesWithoutFillers % PAGES_PER_SHEET)) % PAGES_PER_SHEET;
}

export function countPrintPages(rendered: ParentNode) {
  return rendered.querySelectorAll(PAGE_CONTAINER_SELECTOR).length;
}

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
