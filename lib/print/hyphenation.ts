import { hyphenateSync } from "hyphen/it";

const SOFT_HYPHEN = "­";
const NON_HYPHENATABLE_TOKEN = /(:\/\/|www\.|@|\d)/;

type RichTextNode = {
  type?: unknown;
  text?: unknown;
  marks?: unknown;
  content?: unknown;
};

function hasLinkMark(node: RichTextNode) {
  return (
    Array.isArray(node.marks) &&
    node.marks.some((mark) => (mark as { type?: unknown } | null)?.type === "link")
  );
}

/**
 * Inserts Italian soft hyphens so justified text breaks the same way in every
 * Chromium build: headless Linux Chromium ships without hyphenation dictionaries.
 */
export function hyphenatePrintText(text: string): string {
  return text
    .split(/(\s+)/)
    .map((token) =>
      /\s/.test(token) || NON_HYPHENATABLE_TOKEN.test(token)
        ? token
        : hyphenateSync(token, { hyphenChar: SOFT_HYPHEN, minWordLength: 6 }),
    )
    .join("");
}

export function hyphenatePrintRichText(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;

  const node = value as RichTextNode;
  if (typeof node.text === "string") {
    return hasLinkMark(node) ? node : { ...node, text: hyphenatePrintText(node.text) };
  }

  if (!Array.isArray(node.content)) return node;

  return { ...node, content: node.content.map(hyphenatePrintRichText) };
}
