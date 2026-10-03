import type { PrintFigureMeasure, PrintFigurePlacement } from "@/lib/print/inline-figures";

const FIGURE_SELECTOR = "figure[data-print-side]";
const FIGURE_ATTRIBUTE = "data-print-figure";
const BLOCK_ATTRIBUTE = "data-print-block";
const PAGE_CONTAINER_SELECTOR = "[data-vivliostyle-page-container]";
const PAGE_AREA_SELECTOR = "[data-vivliostyle-page-area]";
const PAGE_AREA_CONTAINER_SELECTOR = "[data-vivliostyle-page-area-container]";
/** Footnote and page float areas sit beside the text column and take from its foot. */
const PAGE_SIDE_AREA_SELECTOR =
  ":scope > [data-vivliostyle-column]:not([data-vivliostyle-page-area])";

export type PrintInlineFigure = {
  id: string;
  placement: PrintFigurePlacement;
  blockCount: number;
};

function blocksOf(parent: Element) {
  return Array.from(parent.children).filter((child) => !child.matches(FIGURE_SELECTOR));
}

/**
 * Numbers the images beside the text and the blocks around them. The source is
 * the same on every pass, so a fresh copy always gets the same numbers. An
 * image after all the text starts beside the last block.
 */
export function markInlineFigures(source: ParentNode): PrintInlineFigure[] {
  const marked = new Set<Element>();

  return Array.from(source.querySelectorAll(FIGURE_SELECTOR)).flatMap((figure, index) => {
    const parent = figure.parentElement;
    if (!parent) return [];

    const blocks = blocksOf(parent);
    if (!marked.has(parent)) {
      blocks.forEach((block, position) => block.setAttribute(BLOCK_ATTRIBUTE, String(position)));
      marked.add(parent);
    }

    const id = String(index);
    figure.setAttribute(FIGURE_ATTRIBUTE, id);
    let next = figure.nextElementSibling;
    while (next?.matches(FIGURE_SELECTOR)) next = next.nextElementSibling;
    const block = next ? blocks.indexOf(next) : Math.max(0, blocks.length - 1);

    return [{ id, placement: { block, backward: false }, blockCount: blocks.length }];
  });
}

/** Moves each image before its block. */
export function applyFigurePlacements(
  source: ParentNode,
  placements: Map<string, PrintFigurePlacement>,
) {
  for (const [id, { block }] of placements) {
    const figure = source.querySelector(`[${FIGURE_ATTRIBUTE}="${CSS.escape(id)}"]`);
    const parent = figure?.parentElement;
    if (!figure || !parent) continue;

    parent.insertBefore(figure, parent.querySelector(`:scope > [${BLOCK_ATTRIBUTE}="${block}"]`));
  }
}

/** Bottom of the room for text on a laid-out page, above notes and page floats. */
function textAreaBottom(column: Element) {
  const container = column.closest(PAGE_AREA_CONTAINER_SELECTOR);
  if (!container) return Number.POSITIVE_INFINITY;

  const sideAreas = Array.from(container.querySelectorAll(PAGE_SIDE_AREA_SELECTOR));
  return Math.min(
    container.getBoundingClientRect().bottom,
    ...sideAreas.map((area) => area.getBoundingClientRect().top),
  );
}

export function measureInlineFigure(rendered: ParentNode, id: string): PrintFigureMeasure {
  const figure = rendered.querySelector(
    `${FIGURE_SELECTOR}[${FIGURE_ATTRIBUTE}="${CSS.escape(id)}"]`,
  );
  const column = figure?.closest(PAGE_AREA_SELECTOR);
  if (!figure || !column || !figure.closest(PAGE_CONTAINER_SELECTOR)) {
    return { overflows: false, lastBlockOnPage: null };
  }

  const blocks = Array.from(figure.parentElement?.children ?? []).flatMap((child) => {
    const position = Number(child.getAttribute(BLOCK_ATTRIBUTE));
    return child.hasAttribute(BLOCK_ATTRIBUTE) && Number.isFinite(position) ? [position] : [];
  });

  return {
    overflows: figure.getBoundingClientRect().bottom > textAreaBottom(column) + 1,
    lastBlockOnPage: blocks.length > 0 ? Math.max(...blocks) : null,
  };
}
