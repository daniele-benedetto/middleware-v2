import { hyphenatePrintText } from "@/lib/print/hyphenation";

export type PrintTextRun = { text: string; bold: boolean; italic: boolean };

type RichTextNode = { type?: unknown; text?: unknown; marks?: unknown; content?: unknown };

const BLOCK_TYPES = new Set(["paragraph", "heading", "blockquote", "listItem"]);

function hasMark(node: RichTextNode, type: string) {
  return (
    Array.isArray(node.marks) &&
    node.marks.some((mark) => (mark as { type?: unknown } | null)?.type === type)
  );
}

/** Print fonts have no emoji glyphs: drop them instead of printing fallback boxes. */
export function stripPictographs(text: string) {
  return text.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "");
}

function collectRuns(node: RichTextNode, bold: boolean, runs: PrintTextRun[]) {
  if (typeof node.text === "string") {
    runs.push({
      text: stripPictographs(node.text),
      bold: bold || hasMark(node, "bold"),
      italic: hasMark(node, "italic"),
    });
    return;
  }

  if (node.type === "hardBreak") {
    runs.push({ text: " ", bold: false, italic: false });
    return;
  }

  const children = Array.isArray(node.content) ? (node.content as RichTextNode[]) : [];
  const childBold = bold || node.type === "heading";
  children.forEach((child) => collectRuns(child, childBold, runs));

  if (BLOCK_TYPES.has(String(node.type))) runs.push({ text: " ", bold: false, italic: false });
}

function mergeRuns(runs: PrintTextRun[]) {
  return runs.reduce<PrintTextRun[]>((merged, run) => {
    const previous = merged.at(-1);
    if (previous && previous.bold === run.bold && previous.italic === run.italic) {
      previous.text += run.text;
    } else {
      merged.push({ ...run });
    }
    return merged;
  }, []);
}

/**
 * Flattens rich text into one inline excerpt, keeping bold and italic. Blocks
 * become spaces so the excerpt can be clamped to an exact number of lines.
 */
export function toPrintTextRuns(value: unknown): PrintTextRun[] {
  if (!value || typeof value !== "object") return [];

  const runs: PrintTextRun[] = [];
  collectRuns(value as RichTextNode, false, runs);

  const merged = mergeRuns(runs).map((run) => ({ ...run, text: run.text.replace(/\s+/g, " ") }));
  if (merged[0]) merged[0].text = merged[0].text.trimStart();
  const last = merged.at(-1);
  if (last) last.text = last.text.trimEnd();

  return merged
    .filter((run) => run.text)
    .map((run) => ({ ...run, text: hyphenatePrintText(run.text) }));
}

/** Keeps at most `maxChars` visible characters, cut on a word, closed by an ellipsis. */
export function truncatePrintTextRuns(runs: PrintTextRun[], maxChars: number): PrintTextRun[] {
  const result: PrintTextRun[] = [];
  let remaining = maxChars;

  for (const run of runs) {
    const visible = run.text.replaceAll("\u00ad", "");
    if (visible.length <= remaining) {
      result.push(run);
      remaining -= visible.length;
      continue;
    }

    let cut = 0;
    let seen = 0;
    while (cut < run.text.length && seen < remaining) {
      if (run.text[cut] !== "\u00ad") seen += 1;
      cut += 1;
    }
    const head = run.text.slice(0, cut);
    const wordEnd = head.search(/\s\S*$/);
    const text = (wordEnd > 0 ? head.slice(0, wordEnd) : head).trimEnd();
    if (text) result.push({ ...run, text: `${text}…` });
    else if (result.length > 0) result.at(-1)!.text = `${result.at(-1)!.text.trimEnd()}…`;
    return result;
  }

  return result;
}
