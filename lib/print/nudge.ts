/**
 * Workaround for a Vivliostyle bug: a two-column text whose first paragraph must
 * break inside a short remaining space can be pushed whole to the next page,
 * leaving the opening page without text. When that happens the viewer shifts
 * the gap under the header (`data-print-nudge` in issue.css) until the text
 * starts on the opening page; if no step works, the article stays as it was.
 */
export const PRINT_NUDGE_MAX_LEVEL = 5;

export type PrintNudgeMeasure = { pageCount: number; openingHasText: boolean };

export type PrintNudgeState = { level: number; done: boolean };

export function startNudge({ pageCount, openingHasText }: PrintNudgeMeasure): PrintNudgeState {
  const needed = pageCount > 1 && !openingHasText;
  return { level: needed ? 1 : 0, done: !needed };
}

export function nextNudge(state: PrintNudgeState, { openingHasText }: PrintNudgeMeasure) {
  if (state.done) return state;
  if (openingHasText) return { ...state, done: true };
  if (state.level < PRINT_NUDGE_MAX_LEVEL) return { ...state, level: state.level + 1 };
  return { level: 0, done: true };
}
