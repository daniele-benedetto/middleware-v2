type RichTextNode = { type?: unknown; content?: unknown };

export function stripPrintBodyImages(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;

  const node = value as RichTextNode;
  if (!Array.isArray(node.content)) return node;

  return {
    ...node,
    content: node.content
      .filter((child: RichTextNode | null) => child?.type !== "image")
      .map(stripPrintBodyImages),
  };
}
