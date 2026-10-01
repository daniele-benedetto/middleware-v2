type RichTextNode = {
  type?: unknown;
  text?: unknown;
  content?: unknown;
};

function nodeLength(node: RichTextNode): number {
  if (typeof node.text === "string") return node.text.length;
  return getChildren(node).reduce((total, child) => total + nodeLength(child), 0);
}

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

/** Splits authored blocks into physical-page candidates without flattening rich text marks. */
export function splitPrintContent(value: unknown, maxCharacters: number): unknown[] {
  return splitPrintContentByCapacity(value, maxCharacters, maxCharacters);
}

/** Uses a smaller first-page budget when a page also carries editorial chrome. */
export function splitPrintContentByCapacity(
  value: unknown,
  firstPageCharacters: number,
  continuationPageCharacters: number,
): unknown[] {
  if (!value || typeof value !== "object") return [value];

  const root = value as RichTextNode;
  const blocks = getChildren(root);
  if (blocks.length === 0) return [value];

  const pages: RichTextNode[][] = [[]];
  let pageLength = 0;

  for (const sourceBlock of blocks) {
    const length = nodeLength(sourceBlock);
    const pageCapacity = pages.length === 1 ? firstPageCharacters : continuationPageCharacters;
    if (pages.at(-1)?.length && pageLength + length > pageCapacity) {
      pages.push([]);
      pageLength = 0;
    }
    pages.at(-1)?.push(sourceBlock);
    pageLength += length;
  }

  return pages.map((content) => ({ ...root, content }));
}
