/**
 * Fitting a section into a fixed number of pages. The paginator lays the
 * section out, the viewer measures how much text spilled past the last allowed
 * page, and these pure helpers compute the next text budget.
 */

/** Characters of text a single item may keep, given a total budget. */
export function distributeFitBudget(lengths: number[], total: number): number[] {
  const budgets = lengths.map(() => 0);
  let remaining = Math.max(0, Math.floor(total));
  let open = lengths.map((length, index) => ({ length, index }));

  // Water-filling: short items keep all their text, long ones share the rest.
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

export const PRINT_FIT_MAX_PASSES = 8;
const SHRINK_STEP = 0.94;

export type PrintFitMeasure = {
  /** Characters laid out on the allowed pages. */
  fittedChars: number;
  /** Characters laid out past the allowed pages. */
  overflowChars: number;
  /** Pages the section used. */
  pageCount: number;
};

/**
 * Next total budget for a section, or null when it already fits. A section
 * that only spills its trailing QR block shrinks by a fixed step.
 */
export function nextFitBudget(
  measure: PrintFitMeasure,
  maxPages: number,
  currentBudget: number,
): number | null {
  if (measure.pageCount <= maxPages) return null;

  const fromMeasure = measure.overflowChars > 0 ? measure.fittedChars : currentBudget;
  return Math.floor(Math.min(fromMeasure, currentBudget) * SHRINK_STEP);
}
