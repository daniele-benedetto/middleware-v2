/** Finish an excerpt at a nearby sentence boundary instead of mid-thought. */
export function nearestPrintSentenceEnd(text: string, budget: number, maxBacktrack = 450) {
  const lowerBound = Math.max(0, budget - maxBacktrack);
  let end: number | null = null;

  for (const match of text.matchAll(/[.!?](?=\s|$|[”»]|[A-ZÀ-Ü])/g)) {
    const position = match.index + 1;
    if (position > budget) break;
    if (position >= lowerBound) end = position;
  }

  return end;
}
