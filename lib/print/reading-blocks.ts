import { resolvePublicMediaUrl } from "@/lib/media/blob";

type Node = {
  type?: unknown;
  text?: unknown;
  content?: unknown;
  attrs?: unknown;
};

export type PrintReadingBlock =
  | { kind: "paragraph" | "heading" | "quote" | "list"; text: string }
  | { kind: "image"; src: string; caption: string };

function children(node: Node): Node[] {
  return Array.isArray(node.content) ? (node.content as Node[]) : [];
}

function textOf(node: Node): string {
  if (typeof node.text === "string") return node.text;
  return children(node)
    .map(textOf)
    .join(node.type === "listItem" ? " " : "");
}

export function extractPrintReadingBlocks(value: unknown): {
  blocks: PrintReadingBlock[];
  unsupported: string[];
} {
  if (!value || typeof value !== "object") return { blocks: [], unsupported: [] };

  const blocks: PrintReadingBlock[] = [];
  const unsupported = new Set<string>();

  function visit(node: Node) {
    if (["paragraph", "heading", "blockquote", "listItem"].includes(String(node.type))) {
      const text = textOf(node).replace(/\s+/g, " ").trim();
      if (text) {
        const kind =
          node.type === "heading"
            ? "heading"
            : node.type === "blockquote"
              ? "quote"
              : node.type === "listItem"
                ? "list"
                : "paragraph";
        blocks.push({ kind, text });
      }
      return;
    }

    if (node.type === "image") {
      const attrs =
        node.attrs && typeof node.attrs === "object" ? (node.attrs as Record<string, unknown>) : {};
      if (typeof attrs.src === "string" && attrs.src) {
        blocks.push({
          kind: "image",
          src: resolvePublicMediaUrl(attrs.src) ?? attrs.src,
          caption: typeof attrs.title === "string" ? attrs.title : "",
        });
      } else {
        unsupported.add("immagine senza sorgente");
      }
      return;
    }

    if (node.type === "noteReference") {
      unsupported.add("note bibliografiche");
      return;
    }
    if (node.type === "codeBlock") {
      unsupported.add("blocchi di codice");
      return;
    }
    children(node).forEach(visit);
  }

  visit(value as Node);
  return { blocks, unsupported: [...unsupported] };
}
