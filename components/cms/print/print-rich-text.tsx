import { Fragment, type ReactNode } from "react";

import { resolveCmsMediaPreviewUrl } from "@/lib/media/blob";
import { resolveSafeRichTextLinkHref } from "@/lib/rich-text/public-schema";

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
    if (!mark || typeof mark !== "object") return current;
    const value = mark as { type?: unknown; attrs?: unknown };

    if (value.type === "bold") return <strong key={index}>{current}</strong>;
    if (value.type === "italic") return <em key={index}>{current}</em>;
    if (value.type === "strike") return <s key={index}>{current}</s>;
    if (value.type === "code") return <code key={index}>{current}</code>;

    if (value.type === "link") {
      const attrs =
        value.attrs && typeof value.attrs === "object" ? (value.attrs as { href?: unknown }) : {};
      const href = resolveSafeRichTextLinkHref(attrs.href);
      return href ? (
        <a key={index} href={href}>
          {current}
        </a>
      ) : (
        current
      );
    }

    return current;
  }, children);
}

function renderInline(node: RichTextNode, key: string): ReactNode {
  if (typeof node.text === "string") {
    return <Fragment key={key}>{renderMarks(node.text, node.marks)}</Fragment>;
  }

  if (node.type === "hardBreak") return <br key={key} />;

  return (
    <Fragment key={key}>
      {childrenOf(node).map((child, index) => renderInline(child, `${key}-${index}`))}
    </Fragment>
  );
}

function renderBlocks(nodes: RichTextNode[], keyPrefix: string): ReactNode {
  return nodes.map((node, index) => renderBlock(node, `${keyPrefix}-${index}`));
}

function renderBlock(node: RichTextNode, key: string): ReactNode {
  const children = childrenOf(node);

  if (node.type === "paragraph") {
    return (
      <p key={key}>{children.map((child, index) => renderInline(child, `${key}-${index}`))}</p>
    );
  }

  if (node.type === "heading") {
    const Heading = attrsOf(node).level === 3 ? "h3" : "h2";
    return (
      <Heading key={key}>
        {children.map((child, index) => renderInline(child, `${key}-${index}`))}
      </Heading>
    );
  }

  if (node.type === "bulletList" || node.type === "orderedList") {
    const List = node.type === "bulletList" ? "ul" : "ol";
    return <List key={key}>{renderBlocks(children, key)}</List>;
  }

  if (node.type === "listItem") {
    return <li key={key}>{renderBlocks(children, key)}</li>;
  }

  if (node.type === "blockquote") {
    return <blockquote key={key}>{renderBlocks(children, key)}</blockquote>;
  }

  if (node.type === "codeBlock") {
    return (
      <pre key={key}>
        <code>
          {children.map((child) => (typeof child.text === "string" ? child.text : "")).join("\n")}
        </code>
      </pre>
    );
  }

  if (node.type === "image") {
    const attrs = attrsOf(node);
    const src = typeof attrs.src === "string" ? resolveCmsMediaPreviewUrl(attrs.src) : null;
    if (!src) return null;

    return (
      <figure key={key} className="print-rich-text__figure">
        {/* CMS media is authenticated and cannot use the public Next Image loader. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={typeof attrs.alt === "string" ? attrs.alt : ""} />
        {typeof attrs.title === "string" && attrs.title ? (
          <figcaption>{attrs.title}</figcaption>
        ) : null}
      </figure>
    );
  }

  return <Fragment key={key}>{renderBlocks(children, key)}</Fragment>;
}

export function PrintRichText({ value }: { value: unknown }) {
  if (!value || typeof value !== "object") return null;

  return (
    <div className="print-rich-text">
      {renderBlocks(childrenOf(value as RichTextNode), "rich-text")}
    </div>
  );
}
