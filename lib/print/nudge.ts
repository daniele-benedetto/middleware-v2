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
