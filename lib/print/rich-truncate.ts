type RichTextNode = { type?: unknown; text?: unknown; content?: unknown };

function textLength(node: RichTextNode): number {
  if (typeof node.text === "string") return node.text.length;
  return Array.isArray(node.content)
    ? (node.content as RichTextNode[]).reduce((total, child) => total + textLength(child), 0)
    : 0;
}

/**
 * Keeps the top-level blocks of a rich text document until `maxChars` of text,
 * so the print source stays light. Fine trimming happens on the laid-out page.
 */
export function truncatePrintRichText(value: unknown, maxChars: number): unknown {
  if (!value || typeof value !== "object") return value;

  const root = value as RichTextNode;
  if (!Array.isArray(root.content)) return root;

  const kept: RichTextNode[] = [];
  let total = 0;
  for (const block of root.content as RichTextNode[]) {
    if (total >= maxChars) break;
    kept.push(block);
    total += textLength(block);
  }

  return { ...root, content: kept };
}
