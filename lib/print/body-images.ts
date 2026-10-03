type RichTextNode = { type?: unknown; attrs?: unknown; content?: unknown };

export type PrintBodyImageSide = "start" | "end";

/** Rich text without its image nodes, at any depth. */
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

type RichTextLeaf = RichTextNode & { text?: unknown };

function withSide(node: RichTextNode, printSide: PrintBodyImageSide): RichTextNode {
  const attrs = node.attrs && typeof node.attrs === "object" ? node.attrs : {};
  return { ...node, attrs: { ...attrs, printSide } };
}

/**
 * Every image goes beside the text, alternating sides in reading order. One
 * before any text takes the end side, away from the drop cap.
 */
export function placePrintBodyImages(value: unknown): unknown {
  let textBefore = false;
  let previous: PrintBodyImageSide | null = null;

  function place(node: unknown): unknown {
    if (!node || typeof node !== "object") return node;

    const current = node as RichTextLeaf;
    if (current.type === "image") {
      const side: PrintBodyImageSide = !textBefore || previous === "start" ? "end" : "start";
      previous = side;
      return withSide(current, side);
    }

    if (typeof current.text === "string" && current.text.trim()) textBefore = true;
    if (!Array.isArray(current.content)) return current;

    return { ...current, content: current.content.map(place) };
  }

  return place(value);
}
