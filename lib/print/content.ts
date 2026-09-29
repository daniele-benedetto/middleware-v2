type RichTextNode = {
  type?: unknown;
  text?: unknown;
  content?: unknown;
};

function getChildren(node: RichTextNode) {
  return Array.isArray(node.content) ? (node.content as RichTextNode[]) : [];
}

function getInlineText(node: RichTextNode): string {
  if (typeof node.text === "string") return node.text;
  return getChildren(node).map(getInlineText).join("");
}

/** Returns printable paragraph units while preserving the authored order. */
export function extractPrintParagraphs(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];

  const root = value as RichTextNode;
  const paragraphs: string[] = [];

  function visit(node: RichTextNode) {
    if (node.type === "paragraph") {
      const text = getInlineText(node).replace(/\s+/g, " ").trim();
      if (text) paragraphs.push(text);
      return;
    }

    getChildren(node).forEach(visit);
  }

  visit(root);
  return paragraphs;
}
