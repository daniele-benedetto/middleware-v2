type RichTextNode = {
  type?: unknown;
  text?: unknown;
  attrs?: unknown;
  marks?: unknown;
  content?: unknown;
};

export const PRINT_NOTE_TYPE = "printNote";

const SUPERSCRIPT_DIGITS = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const SUPERSCRIPT_RUN = /[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g;
const TYPED_NOTE_MARKER = /^\s*([⁰¹²³⁴⁵⁶⁷⁸⁹]+)\s*/;

function childrenOf(node: RichTextNode) {
  return Array.isArray(node.content) ? (node.content as RichTextNode[]) : [];
}

function plainText(node: RichTextNode): string {
  if (typeof node.text === "string") return node.text;
  return childrenOf(node).map(plainText).join("");
}

function superscriptNumber(run: string) {
  return Number([...run].map((char) => SUPERSCRIPT_DIGITS.indexOf(char)).join(""));
}

function toNote(content: RichTextNode[]): RichTextNode {
  return { type: PRINT_NOTE_TYPE, content };
}

/** CMS notes keep their text in `attrs.contentRich`: its paragraphs become one inline run. */
function cmsNoteContent(node: RichTextNode): RichTextNode[] {
  const attrs = node.attrs && typeof node.attrs === "object" ? node.attrs : {};
  const contentRich = (attrs as { contentRich?: unknown }).contentRich as RichTextNode | undefined;
  if (!contentRich || typeof contentRich !== "object") return [];

  return childrenOf(contentRich).flatMap((block, index) => [
    ...(index > 0 ? [{ type: "text", text: " " }] : []),
    ...childrenOf(block),
  ]);
}

function stripMarker(content: RichTextNode[]) {
  const [first, ...rest] = content;
  if (typeof first?.text !== "string") return content;

  const text = first.text.replace(TYPED_NOTE_MARKER, "");
  return text ? [{ ...first, text }, ...rest] : rest;
}

/** Hand-typed notes: a closing run of paragraphs that start with a superscript number. */
function splitTypedNotes(blocks: RichTextNode[]) {
  const notes = new Map<number, RichTextNode[]>();
  let end = blocks.length;

  while (end > 0) {
    const block = blocks[end - 1]!;
    const text = plainText(block);
    if (block.type === "paragraph" && !text.trim()) {
      end -= 1;
      continue;
    }

    const marker = block.type === "paragraph" ? TYPED_NOTE_MARKER.exec(text) : null;
    if (!marker) break;
    notes.set(superscriptNumber(marker[1]!), stripMarker(childrenOf(block)));
    end -= 1;
  }

  return { body: blocks.slice(0, end), notes };
}

function splitTextCalls(node: RichTextNode, notes: Map<number, RichTextNode[]>) {
  const text = node.text as string;
  const parts: RichTextNode[] = [];
  let last = 0;

  for (const match of text.matchAll(SUPERSCRIPT_RUN)) {
    const note = notes.get(superscriptNumber(match[0]));
    if (!note) continue;

    if (match.index > last) parts.push({ ...node, text: text.slice(last, match.index) });
    parts.push(toNote(note));
    notes.delete(superscriptNumber(match[0]));
    last = match.index + match[0].length;
  }

  if (parts.length === 0) return [node];
  if (last < text.length) parts.push({ ...node, text: text.slice(last) });
  return parts;
}

function placeNotes(node: RichTextNode, typedNotes: Map<number, RichTextNode[]>): RichTextNode[] {
  if (node.type === "noteReference") {
    const content = cmsNoteContent(node);
    return content.length > 0 ? [toNote(content)] : [];
  }

  if (typeof node.text === "string") {
    return typedNotes.size > 0 ? splitTextCalls(node, typedNotes) : [node];
  }

  if (!Array.isArray(node.content)) return [node];

  return [{ ...node, content: childrenOf(node).flatMap((child) => placeNotes(child, typedNotes)) }];
}

/**
 * Turns the notes of an article into `printNote` inline nodes at their call,
 * so print can lay them out as footnotes. Both the CMS note references and
 * the hand-typed convention (superscript calls, numbered paragraphs at the
 * end) are supported; typed notes without a call in the text stay where they are.
 */
export function toPrintNotes(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;

  const root = value as RichTextNode;
  if (!Array.isArray(root.content)) return root;

  const { body, notes } = splitTypedNotes(childrenOf(root));
  const pending = new Map(notes);
  const placed = body.flatMap((block) => placeNotes(block, pending));
  const unplaced = childrenOf(root)
    .slice(body.length)
    .filter((block) => {
      const marker = TYPED_NOTE_MARKER.exec(plainText(block));
      return marker ? pending.has(superscriptNumber(marker[1]!)) : false;
    });

  return { ...root, content: [...placed, ...unplaced] };
}
