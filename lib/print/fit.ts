export function distributeFitBudget(lengths: number[], total: number): number[] {
  const budgets = lengths.map(() => 0);
  let remaining = Math.max(0, Math.floor(total));
  let open = lengths.map((length, index) => ({ length, index }));

  while (open.length > 0 && remaining > 0) {
    const share = Math.floor(remaining / open.length);
    const fitting = open.filter((item) => item.length - budgets[item.index]! <= share);

    if (fitting.length === 0) {
      open.forEach((item) => (budgets[item.index]! += share));
      break;
    }

    for (const item of fitting) {
      const grant = item.length - budgets[item.index]!;
      budgets[item.index]! += grant;
      remaining -= grant;
    }
    open = open.filter((item) => !fitting.includes(item));
  }

  return budgets;
}

export const PRINT_FIT_MAX_PASSES = 24;
const SHRINK_STEP = 0.94;

export type PrintFitMeasure = {
  fittedChars: number;
  overflowChars: number;
  pageCount: number;
};

export function nextFitBudget(
  measure: PrintFitMeasure,
  maxPages: number,
  currentBudget: number,
): number | null {
  if (measure.pageCount <= maxPages) return null;

  const fromMeasure = measure.overflowChars > 0 ? measure.fittedChars : currentBudget;
  return Math.floor(Math.min(fromMeasure, currentBudget) * SHRINK_STEP);
}
