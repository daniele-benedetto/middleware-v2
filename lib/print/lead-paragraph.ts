type RichTextNode = { type?: unknown; content?: unknown };

/**
 * The article excerpt opens the running text as its first paragraph, so on
 * paper it reads as part of the article (drop cap, body type, same trimming).
 */
export function prependPrintLeadParagraph(value: unknown, text: string | null): unknown {
  const lead = text?.trim();
  if (!lead) return value;

  const paragraph = { type: "paragraph", content: [{ type: "text", text: lead }] };
  const node = value && typeof value === "object" ? (value as RichTextNode) : null;
  const content = Array.isArray(node?.content) ? node.content : [];

  return { ...node, type: node?.type ?? "doc", content: [paragraph, ...content] };
}
