/** Keep apostrophes and opening quotes attached to the printed initial. */
export function splitPrintDropCap(text: string) {
  const match = text.match(/^([“«„‘"'’]?\p{L}[’'])/u) ?? text.match(/^([“«„‘"'’]\p{L})/u);
  if (!match) return null;

  return { initial: match[1], rest: text.slice(match[1].length) };
}
