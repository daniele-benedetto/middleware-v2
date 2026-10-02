import { distributeFitBudget, type PrintFitMeasure } from "@/lib/print/fit";

import type { PrintTailMeasure } from "@/lib/print/tighten";

const PAGE_CONTAINER_SELECTOR = "[data-vivliostyle-page-container]";
const SECTION_SELECTOR = "[data-print-fit-pages]";
const TEXT_SELECTOR = "[data-print-fit-text]";
const FOOTNOTE_SELECTOR = ".print-footnote";
const SOFT_HYPHEN = /­/g;
const ELLIPSIS = "…";

/** Running text only: footnotes leave the column and never take the ellipsis. */
function runningTextNodes(element: Element) {
  const walker = element.ownerDocument.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.parentElement?.closest(FOOTNOTE_SELECTOR)
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT,
  });
  const nodes: Text[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) nodes.push(node as Text);
  return nodes;
}

function visibleLength(element: Element) {
  return runningTextNodes(element).reduce(
    (total, node) => total + (node.textContent ?? "").replace(SOFT_HYPHEN, "").length,
    0,
  );
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
  const pages = pagesWithAnchor(rendered, anchor);
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

  let remaining = budget;

  for (const node of runningTextNodes(element)) {
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

const BOX_SELECTOR = "[data-print-fit-box]";

function overflows(box: HTMLElement) {
  return box.scrollWidth > box.clientWidth + 1 || box.scrollHeight > box.clientHeight + 1;
}

/**
 * Fixed-size boxes (course meetings) keep as much text as they can show: a
 * binary search on the visible characters, ending on a word with an ellipsis.
 * The boxes do not change size, so the pagination stays valid.
 */
export function fitPrintBoxes(rendered: ParentNode) {
  for (const box of Array.from(rendered.querySelectorAll<HTMLElement>(BOX_SELECTOR))) {
    if (!overflows(box)) continue;

    const original = box.innerHTML;
    let low = 0;
    let high = visibleLength(box);

    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      box.innerHTML = original;
      truncateFitText(box, middle);
      if (overflows(box)) high = middle - 1;
      else low = middle;
    }

    box.innerHTML = original;
    truncateFitText(box, low);
  }
}

const TIGHTEN_SELECTOR = ".article[data-print-anchor]:not([data-print-fit-pages])";
const NUDGE_SELECTOR =
  ".article[data-print-anchor]:not(.article--fullscreen):not(.article--halfpage)";

export function pagesWithAnchor(rendered: ParentNode, anchor: string) {
  return Array.from(rendered.querySelectorAll(PAGE_CONTAINER_SELECTOR)).filter((page) =>
    page.querySelector(`[data-print-anchor="${CSS.escape(anchor)}"]`),
  );
}

/** Text lines of an element across its columns, from the rendered line boxes. */
function countLines(element: Element) {
  const bounds = element.getBoundingClientRect();
  const middle = bounds.left + bounds.width / 2;
  const lines = new Set<string>();
  const walker = element.ownerDocument.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const range = element.ownerDocument.createRange();

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent?.trim()) continue;
    range.selectNodeContents(node);
    for (const rect of Array.from(range.getClientRects())) {
      if (rect.width === 0) continue;
      lines.add(`${rect.left < middle ? 0 : 1}:${Math.round(rect.top)}`);
    }
  }

  return lines.size;
}

/** Full articles: candidates for pulling a short tail back. */
function collectAnchors(source: ParentNode, selector: string) {
  return Array.from(source.querySelectorAll(selector)).flatMap((article) => {
    const anchor = article.getAttribute("data-print-anchor");
    return anchor ? [anchor] : [];
  });
}

export function collectTightenAnchors(source: ParentNode) {
  return collectAnchors(source, TIGHTEN_SELECTOR);
}

export function collectNudgeAnchors(source: ParentNode) {
  return collectAnchors(source, NUDGE_SELECTOR);
}

export function measureArticleTail(rendered: ParentNode, anchor: string): PrintTailMeasure {
  const pages = pagesWithAnchor(rendered, anchor);
  const body = pages.at(-1)?.querySelector(".article__body");

  return { pageCount: pages.length, tailLines: body ? countLines(body) : 0 };
}

/** Marks each article with its adjustment level (see `data-print-tighten` in issue.css). */
export function applyTightenLevels(source: ParentNode, levels: Map<string, number>) {
  for (const [anchor, level] of levels) {
    const article = source.querySelector(`[data-print-anchor="${CSS.escape(anchor)}"]`);
    if (!article) continue;
    if (level > 0) article.setAttribute("data-print-tighten", String(level));
    else article.removeAttribute("data-print-tighten");
  }
}

/** Whether the article's opening page carries body text (see lib/print/nudge.ts). */
export function measureArticleOpening(rendered: ParentNode, anchor: string) {
  const pages = pagesWithAnchor(rendered, anchor);
  const body = pages[0]?.querySelector(".article__body");

  return { pageCount: pages.length, openingHasText: Boolean(body?.textContent?.trim()) };
}

/** Marks each article with its header gap step (see `data-print-nudge` in issue.css). */
export function applyNudgeLevels(source: ParentNode, levels: Map<string, number>) {
  for (const [anchor, level] of levels) {
    const article = source.querySelector(`[data-print-anchor="${CSS.escape(anchor)}"]`);
    if (!article) continue;
    if (level > 0) article.setAttribute("data-print-nudge", String(level));
    else article.removeAttribute("data-print-nudge");
  }
}
