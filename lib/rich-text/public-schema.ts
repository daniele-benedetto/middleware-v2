export const PUBLIC_RICH_TEXT_NODE_TYPES = [
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "codeBlock",
  "image",
  "noteReference",
  "hardBreak",
  "text",
] as const;

export const PUBLIC_RICH_TEXT_MARK_TYPES = ["bold", "italic", "strike", "code", "link"] as const;

export type PublicRichTextNodeType = (typeof PUBLIC_RICH_TEXT_NODE_TYPES)[number];
export type PublicRichTextMarkType = (typeof PUBLIC_RICH_TEXT_MARK_TYPES)[number];

export function isPublicRichTextNodeType(value: unknown): value is PublicRichTextNodeType {
  return PUBLIC_RICH_TEXT_NODE_TYPES.includes(value as PublicRichTextNodeType);
}

export function isPublicRichTextMarkType(value: unknown): value is PublicRichTextMarkType {
  return PUBLIC_RICH_TEXT_MARK_TYPES.includes(value as PublicRichTextMarkType);
}

export function resolveSafeRichTextLinkHref(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const href = value.trim();

  if (!href) {
    return null;
  }

  if (href.startsWith("/") || href.startsWith("#")) {
    return href;
  }

  try {
    const url = new URL(href);

    if (["http:", "https:", "mailto:", "tel:"].includes(url.protocol)) {
      return url.toString();
    }
  } catch {
    return null;
  }

  return null;
}

export function isExternalRichTextLink(href: string) {
  return href.startsWith("http://") || href.startsWith("https://");
}
