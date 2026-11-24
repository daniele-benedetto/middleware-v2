export const PRINT_TAIL_MAX_LINES = 10;
export const PRINT_TIGHTEN_MAX_LEVEL = 2;

export type PrintTightenState = {
  level: number;
  baselinePages: number;
  done: boolean;
};

export type PrintTailMeasure = { pageCount: number; tailLines: number };

export function startTighten({ pageCount, tailLines }: PrintTailMeasure): PrintTightenState {
  const worthIt = pageCount > 1 && tailLines > 0 && tailLines <= PRINT_TAIL_MAX_LINES;
  return { level: worthIt ? 1 : 0, baselinePages: pageCount, done: !worthIt };
}

export function nextTighten(
  state: PrintTightenState,
  { pageCount }: PrintTailMeasure,
): PrintTightenState {
  if (state.done) return state;
  if (pageCount < state.baselinePages) return { ...state, done: true };
  if (state.level < PRINT_TIGHTEN_MAX_LEVEL) return { ...state, level: state.level + 1 };
  return { ...state, level: 0, done: true };
}
