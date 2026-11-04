import { Fragment, type ReactNode } from "react";

import { splitPrintDropCap } from "@/lib/print/drop-cap";
import { isInterviewQuestion } from "@/lib/print/interview";
import { PRINT_NOTE_TYPE } from "@/lib/print/notes";

type RichTextNode = {
  type?: unknown;
  text?: unknown;
  attrs?: unknown;
  marks?: unknown;
  content?: unknown;
};

function childrenOf(node: RichTextNode) {
  return Array.isArray(node.content) ? (node.content as RichTextNode[]) : [];
}

function attrsOf(node: RichTextNode) {
  return node.attrs && typeof node.attrs === "object"
    ? (node.attrs as Record<string, unknown>)
    : {};
}

function renderMarks(children: ReactNode, marks: unknown) {
  if (!Array.isArray(marks)) return children;

  return marks.reduce<ReactNode>((current, mark, index) => {
    const type = mark && typeof mark === "object" ? (mark as { type?: unknown }).type : null;

    if (type === "bold") return <strong key={index}>{current}</strong>;
    if (type === "italic") return <em key={index}>{current}</em>;
    if (type === "strike") return <s key={index}>{current}</s>;

    return current;
  }, children);
}

function renderInline(node: RichTextNode, key: string): ReactNode {
  if (typeof node.text === "string") {
    return <Fragment key={key}>{renderMarks(node.text, node.marks)}</Fragment>;
  }

  if (node.type === "hardBreak") return <br key={key} />;
  if (node.type === "noteReference") return null;
  if (node.type === PRINT_NOTE_TYPE) {
    return (
      <span key={key} className="print-footnote">
        {renderInlineChildren(node, key)}
      </span>
    );
  }

  return (
    <Fragment key={key}>
      {childrenOf(node).map((child, index) => renderInline(child, `${key}-${index}`))}
    </Fragment>
  );
}

function renderInlineChildren(node: RichTextNode, key: string) {
  return childrenOf(node).map((child, index) => renderInline(child, `${key}-${index}`));
}

function renderLeadParagraph(node: RichTextNode, key: string) {
  const [first, ...following] = childrenOf(node);
  const initial = typeof first?.text === "string" ? splitPrintDropCap(first.text) : null;
  if (!initial) return renderBlock(node, key);

  return (
    <p key={key} className="print-lead--manual-dropcap">
      <span className="print-drop-cap">{initial.initial}</span>
      {renderMarks(initial.rest, first?.marks)}
      {following.map((child, index) => renderInline(child, `${key}-${index + 1}`))}
    </p>
  );
}

function renderBlocks(nodes: RichTextNode[], keyPrefix: string, dropCap = false): ReactNode {
  return nodes.map((node, index) =>
    dropCap && index === 0 && node.type === "paragraph"
      ? renderLeadParagraph(node, `${keyPrefix}-${index}`)
      : renderBlock(node, `${keyPrefix}-${index}`),
  );
}

function renderBlock(node: RichTextNode, key: string): ReactNode {
  switch (node.type) {
    case "paragraph":
      return (
        <p key={key} className={isInterviewQuestion(node) ? "print-question" : undefined}>
          {renderInlineChildren(node, key)}
        </p>
      );
    case "heading":
      return attrsOf(node).level === 3 ? (
        <h3 key={key}>{renderInlineChildren(node, key)}</h3>
      ) : (
        <h2 key={key}>{renderInlineChildren(node, key)}</h2>
      );
    case "bulletList":
      return <ul key={key}>{renderBlocks(childrenOf(node), key)}</ul>;
    case "orderedList":
      return <ol key={key}>{renderBlocks(childrenOf(node), key)}</ol>;
    case "listItem":
      return <li key={key}>{renderBlocks(childrenOf(node), key)}</li>;
    case "blockquote":
      return <blockquote key={key}>{renderBlocks(childrenOf(node), key)}</blockquote>;
    case "image":
      return null;
    case "codeBlock":
    case "table":
      return null;
    default:
      return <Fragment key={key}>{renderBlocks(childrenOf(node), key)}</Fragment>;
  }
}

export function PrintRichText({ value, dropCap = false }: { value: unknown; dropCap?: boolean }) {
  if (!value || typeof value !== "object") return null;

  return <>{renderBlocks(childrenOf(value as RichTextNode), "rich-text", dropCap)}</>;
}
