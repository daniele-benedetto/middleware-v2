import { pagesWithAnchor } from "@/lib/print/fit-dom";

const END_LOGO_SECTION_SELECTOR = "[data-print-anchor][data-print-end-logo]";
const PAGE_BOX_SELECTOR = "[data-vivliostyle-page-box]";

export const PRINT_END_LOGO_SRC = "/brand/middleware-pictogram-red.png";

export function collectEndLogoAnchors(source: ParentNode) {
  return Array.from(source.querySelectorAll(END_LOGO_SECTION_SELECTOR)).flatMap((section) => {
    const anchor = section.getAttribute("data-print-anchor");
    return anchor ? [anchor] : [];
  });
}

export function placePrintEndLogos(rendered: ParentNode, anchors: string[]) {
  for (const anchor of anchors) {
    const pageBox = pagesWithAnchor(rendered, anchor).at(-1)?.querySelector(PAGE_BOX_SELECTOR);
    if (!pageBox) continue;

    const logo = pageBox.ownerDocument.createElement("img");
    logo.className = "print-end-logo";
    logo.src = PRINT_END_LOGO_SRC;
    logo.alt = "";
    pageBox.appendChild(logo);
  }
}
