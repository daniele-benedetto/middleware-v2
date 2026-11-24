type RichTextNode = { type?: unknown; content?: unknown };

export function prependPrintLeadParagraph(value: unknown, text: string | null): unknown {
  const lead = text?.trim();
  if (!lead) return value;

  const paragraph = { type: "paragraph", content: [{ type: "text", text: lead }] };
  const node = value && typeof value === "object" ? (value as RichTextNode) : null;
  const content = Array.isArray(node?.content) ? node.content : [];

  return { ...node, type: node?.type ?? "doc", content: [paragraph, ...content] };
}
