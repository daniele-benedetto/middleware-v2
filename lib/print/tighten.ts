/**
 * Pulling back a short tail: when a full article spills onto a new page by a
 * few lines, the viewer tries a hair of tracking, then a little more (see
 * public/print/issue.css) until the tail fits on the previous page. Photos
 * keep their height. If none works, the article goes back to its layout.
 */

/** Lines on the last page that are worth pulling back. */
export const PRINT_TAIL_MAX_LINES = 10;
export const PRINT_TIGHTEN_MAX_LEVEL = 2;

export type PrintTightenState = {
  level: number;
  /** Pages the article used without adjustments. */
  baselinePages: number;
  done: boolean;
};

export type PrintTailMeasure = { pageCount: number; tailLines: number };

/** First decision, from the article laid out without adjustments. */
export function startTighten({ pageCount, tailLines }: PrintTailMeasure): PrintTightenState {
  const worthIt = pageCount > 1 && tailLines > 0 && tailLines <= PRINT_TAIL_MAX_LINES;
  return { level: worthIt ? 1 : 0, baselinePages: pageCount, done: !worthIt };
}

/** Next state after a pass laid out at `state.level`. */
export function nextTighten(
  state: PrintTightenState,
  { pageCount }: PrintTailMeasure,
): PrintTightenState {
  if (state.done) return state;
  if (pageCount < state.baselinePages) return { ...state, done: true };
  if (state.level < PRINT_TIGHTEN_MAX_LEVEL) return { ...state, level: state.level + 1 };
  return { ...state, level: 0, done: true };
}
