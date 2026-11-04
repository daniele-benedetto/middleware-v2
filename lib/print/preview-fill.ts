/** Keep a modest breathing space above the QR, matching other fitted articles. */
export const MIN_PREVIEW_QR_GAP_LINES = 2;
const IDEAL_PREVIEW_QR_GAP_LINES = 3;
const MIN_BUDGET_STEP = 80;

export type PreviewFillState = { lower: number; upper: number; current: number };

export function startPreviewFill(
  currentBudget: number,
  upperBudget: number,
): PreviewFillState | null {
  if (upperBudget - currentBudget < MIN_BUDGET_STEP) return null;
  return {
    lower: currentBudget,
    upper: upperBudget,
    current: Math.ceil((currentBudget + upperBudget) / 2),
  };
}

export function nextPreviewFill(
  state: PreviewFillState,
  { fits, gapLines }: { fits: boolean; gapLines: number | null },
): { state: PreviewFillState | null; budget: number | null } {
  const safe = fits && gapLines !== null && gapLines >= MIN_PREVIEW_QR_GAP_LINES;
  if (safe && gapLines <= IDEAL_PREVIEW_QR_GAP_LINES) return { state: null, budget: null };

  const lower = safe ? state.current : state.lower;
  const upper = safe ? state.upper : state.current - 1;
  if (upper - lower < MIN_BUDGET_STEP) {
    return { state: null, budget: safe ? null : lower };
  }

  const current = Math.ceil((lower + upper) / 2);
  return { state: { lower, upper, current }, budget: current };
}
