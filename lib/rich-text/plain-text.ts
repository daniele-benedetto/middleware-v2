type RichTextNode = {
  text?: unknown;
  type?: unknown;
  content?: unknown;
};

const BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "blockquote",
  "bulletList",
  "orderedList",
  "listItem",
]);

function collectFragments(value: unknown, fragments: string[]) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectFragments(item, fragments));
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  const node = value as RichTextNode;

  if (typeof node.text === "string") {
    fragments.push(node.text);
  }

  if (node.type === "hardBreak") {
    fragments.push("\n");
  }

  if (node.content !== undefined) {
    collectFragments(node.content, fragments);
    if (typeof node.type === "string" && BLOCK_TYPES.has(node.type)) {
      fragments.push("\n\n");
    }
  }
}

/**
 * Extract plain text from a TipTap-style rich-text JSON document.
 * Returns a single-line string with collapsed whitespace, or `null` when empty.
 */
export function extractPlainText(value: unknown): string | null {
  const fragments: string[] = [];
  collectFragments(value, fragments);
  const text = fragments.join(" ").replace(/\s+/g, " ").trim();
  return text.length > 0 ? text : null;
}

/**
 * Extract plain text preserving paragraph breaks (`\n\n`).
 * Useful for rendering excerpts split into multiple paragraphs.
 */
export function extractPlainTextWithBreaks(value: unknown): string | null {
  const fragments: string[] = [];
  collectFragments(value, fragments);
  const text = fragments
    .join("")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter((paragraph) => paragraph.length > 0)
    .join("\n\n");
  return text.length > 0 ? text : null;
}
