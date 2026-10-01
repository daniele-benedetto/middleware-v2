import { distributeFitBudget, type PrintFitMeasure } from "@/lib/print/fit";

const PAGE_CONTAINER_SELECTOR = "[data-vivliostyle-page-container]";
const SECTION_SELECTOR = "[data-print-fit-pages]";
const TEXT_SELECTOR = "[data-print-fit-text]";
const SOFT_HYPHEN = /­/g;
const ELLIPSIS = "…";

function visibleLength(element: Element) {
  return (element.textContent ?? "").replace(SOFT_HYPHEN, "").length;
}

export type PrintFitSection = { anchor: string; maxPages: number; lengths: number[] };

/** Sections of the print source that must fit into a number of pages. */
export function collectFitSections(source: ParentNode): PrintFitSection[] {
  return Array.from(source.querySelectorAll(SECTION_SELECTOR)).flatMap((section) => {
    const anchor = section.getAttribute("data-print-anchor");
    const maxPages = Number(section.getAttribute("data-print-fit-pages"));
    if (!anchor || !maxPages) return [];

    return [
      {
        anchor,
        maxPages,
        lengths: Array.from(section.querySelectorAll(TEXT_SELECTOR)).map(visibleLength),
      },
    ];
  });
}

/** Text of a section laid out on its allowed pages and past them. */
export function measureFitSection(
  rendered: ParentNode,
  { anchor, maxPages }: Pick<PrintFitSection, "anchor" | "maxPages">,
): PrintFitMeasure {
  const pages = Array.from(rendered.querySelectorAll(PAGE_CONTAINER_SELECTOR)).filter((page) =>
    page.querySelector(`[data-print-anchor="${CSS.escape(anchor)}"]`),
  );
  const textOf = (page: Element) =>
    Array.from(page.querySelectorAll(TEXT_SELECTOR)).reduce(
      (total, element) => total + visibleLength(element),
      0,
    );

  return {
    fittedChars: pages.slice(0, maxPages).reduce((total, page) => total + textOf(page), 0),
    overflowChars: pages.slice(maxPages).reduce((total, page) => total + textOf(page), 0),
    pageCount: pages.length,
  };
}

function removeFollowing(node: Node, boundary: Element) {
  let current: Node | null = node;
  while (current && current !== boundary) {
    while (current.nextSibling) current.parentNode?.removeChild(current.nextSibling);
    current = current.parentNode;
  }
}

/** Cuts an element after `budget` visible characters, on a word, with an ellipsis. */
export function truncateFitText(element: Element, budget: number) {
  if (visibleLength(element) <= budget) return;

  const document = element.ownerDocument;
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let remaining = budget;

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? "";
    const visible = text.replace(SOFT_HYPHEN, "");
    if (visible.length <= remaining) {
      remaining -= visible.length;
      continue;
    }

    let cut = 0;
    for (let seen = 0; cut < text.length && seen < remaining; cut += 1) {
      if (text[cut] !== "­") seen += 1;
    }
    const head = text.slice(0, cut);
    const wordEnd = head.search(/\s\S*$/);
    node.textContent = `${(wordEnd > 0 ? head.slice(0, wordEnd) : head).trimEnd()}${ELLIPSIS}`;
    removeFollowing(node, element);
    return;
  }
}

/** Applies each section's total budget to its texts, sharing it among them. */
export function applyFitBudgets(source: ParentNode, budgets: Map<string, number>) {
  for (const section of Array.from(source.querySelectorAll(SECTION_SELECTOR))) {
    const budget = budgets.get(section.getAttribute("data-print-anchor") ?? "");
    if (budget === undefined) continue;

    const texts = Array.from(section.querySelectorAll(TEXT_SELECTOR));
    const shares = distributeFitBudget(texts.map(visibleLength), budget);
    texts.forEach((text, index) => truncateFitText(text, shares[index] ?? 0));
  }
}
