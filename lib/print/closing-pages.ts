import type { PrintFitSection } from "@/lib/print/fit-dom";

/** A spare leaf is worth using only for substantial, previously omitted copy. */
export const MIN_CLOSING_PAGE_LINES = 18;
const MIN_REMAINING_CHARS = 600;

export function nextClosingSection(
  sections: PrintFitSection[],
  budgets: Map<string, number>,
  attempted: Set<string>,
) {
  return sections.toReversed().find((section) => {
    if (attempted.has(section.anchor)) return false;
    const originalLength = section.lengths.reduce((sum, length) => sum + length, 0);
    return originalLength - (budgets.get(section.anchor) ?? originalLength) >= MIN_REMAINING_CHARS;
  });
}

export function acceptsClosingExpansion({
  beforePages,
  afterPages,
  beforeFillers,
  afterFillers,
  tailLines,
}: {
  beforePages: number;
  afterPages: number;
  beforeFillers: number;
  afterFillers: number;
  tailLines: number;
}) {
  return (
    afterPages === beforePages + 1 &&
    afterFillers === beforeFillers - 1 &&
    tailLines >= MIN_CLOSING_PAGE_LINES
  );
}
