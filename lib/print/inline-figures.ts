/**
 * Images beside the text are CSS floats. Vivliostyle does not push a float that
 * runs past the foot of the page to the next one: the image overflows the page
 * and is clipped. The viewer then moves the image before the first block that
 * starts on the next page and lays the issue out again. An image always keeps
 * a block beside it: when none is left after it, it moves back one block per
 * pass until it fits.
 */

export type PrintFigurePlacement = {
  /** Index of the block the image sits before. */
  block: number;
  backward: boolean;
};

export type PrintFigureMeasure = {
  overflows: boolean;
  /** Last block of the image's text laid out on the image's page. */
  lastBlockOnPage: number | null;
};

/** Next placement of an image, or null when it fits or cannot move. */
export function nextFigurePlacement(
  { block, backward }: PrintFigurePlacement,
  { overflows, lastBlockOnPage }: PrintFigureMeasure,
  blockCount: number,
): PrintFigurePlacement | null {
  if (!overflows) return null;

  if (!backward) {
    const next = Math.max(block + 1, (lastBlockOnPage ?? block) + 1);
    if (next < blockCount) return { block: next, backward: false };
  }

  const previous = Math.min(block, blockCount) - 1;
  return previous >= 0 ? { block: previous, backward: true } : null;
}
