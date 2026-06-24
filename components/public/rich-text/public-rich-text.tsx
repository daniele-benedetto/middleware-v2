import Image from "next/image";
import { Fragment, type ReactNode } from "react";

import { publicTypography } from "@/components/public/primitives";
import { resolvePublicMediaUrl } from "@/lib/media/blob";
import {
  isExternalRichTextLink,
  isPublicRichTextMarkType,
  isPublicRichTextNodeType,
  resolveSafeRichTextLinkHref,
} from "@/lib/rich-text/public-schema";
import { cn } from "@/lib/utils";

type RichTextMark = {
  type?: unknown;
  attrs?: unknown;
};

type RichTextNode = {
  type?: unknown;
  text?: unknown;
  attrs?: unknown;
  marks?: unknown;
  content?: unknown;
};

type PublicRichTextProps = {
  value: unknown;
  className?: string;
};

function getNodeContent(node: RichTextNode): RichTextNode[] {
  return Array.isArray(node.content) ? (node.content as RichTextNode[]) : [];
}

function getHeadingLevel(node: RichTextNode): 2 | 3 {
  if (!node.attrs || typeof node.attrs !== "object") return 2;

  const level = (node.attrs as { level?: unknown }).level;
  return level === 3 ? 3 : 2;
}

function getImageAttrs(node: RichTextNode) {
  if (!node.attrs || typeof node.attrs !== "object") {
    return null;
  }

  const attrs = node.attrs as { src?: unknown; alt?: unknown; title?: unknown };

  if (typeof attrs.src !== "string" || !attrs.src) {
    return null;
  }

  return {
    src: resolvePublicMediaUrl(attrs.src) ?? attrs.src,
    alt: typeof attrs.alt === "string" ? attrs.alt : "",
    title: typeof attrs.title === "string" ? attrs.title : undefined,
  };
}

function renderMarks(children: ReactNode, marks: unknown): ReactNode {
  if (!Array.isArray(marks)) {
    return children;
  }

  return (marks as RichTextMark[]).reduce<ReactNode>((current, mark, index) => {
    if (!isPublicRichTextMarkType(mark.type)) return current;
    if (mark.type === "bold") return <strong key={index}>{current}</strong>;
    if (mark.type === "italic") return <em key={index}>{current}</em>;
    if (mark.type === "strike") return <s key={index}>{current}</s>;
    if (mark.type === "code") return <code key={index}>{current}</code>;
    if (mark.type === "link") {
      const href = resolveSafeRichTextLinkHref(
        mark.attrs && typeof mark.attrs === "object"
          ? (mark.attrs as { href?: unknown }).href
          : null,
      );

      if (!href) return current;

      const external = isExternalRichTextLink(href);

      return (
        <a
          key={index}
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
        >
          {current}
        </a>
      );
    }
    return current;
  }, children);
}

function renderInlineNode(node: RichTextNode, key: string): ReactNode {
  if (typeof node.text === "string") {
    return <Fragment key={key}>{renderMarks(node.text, node.marks)}</Fragment>;
  }

  if (node.type === "hardBreak") {
    return <br key={key} />;
  }

  return renderInlineContent(node, key);
}

function renderInlineContent(node: RichTextNode, keyPrefix: string): ReactNode {
  return getNodeContent(node).map((child, index) =>
    renderInlineNode(child, `${keyPrefix}-${index}`),
  );
}

function renderBlockNode(node: RichTextNode, key: string): ReactNode {
  if (!isPublicRichTextNodeType(node.type)) {
    return <Fragment key={key}>{renderInlineContent(node, key)}</Fragment>;
  }

  if (node.type === "paragraph") {
    return <p key={key}>{renderInlineContent(node, key)}</p>;
  }

  if (node.type === "heading") {
    const level = getHeadingLevel(node);
    const className = cn(
      "font-heading font-black tracking-[-0.035em] text-foreground",
      level === 2 ? "text-[clamp(30px,4vw,54px)] leading-[0.95]" : "text-2xl leading-tight",
    );

    return level === 3 ? (
      <h3 key={key} className={className}>
        {renderInlineContent(node, key)}
      </h3>
    ) : (
      <h2 key={key} className={className}>
        {renderInlineContent(node, key)}
      </h2>
    );
  }

  if (node.type === "bulletList") {
    return (
      <ul key={key} className="list-disc pl-6">
        {getNodeContent(node).map((child, index) => renderBlockNode(child, `${key}-${index}`))}
      </ul>
    );
  }

  if (node.type === "orderedList") {
    return (
      <ol key={key} className="list-decimal pl-6">
        {getNodeContent(node).map((child, index) => renderBlockNode(child, `${key}-${index}`))}
      </ol>
    );
  }

  if (node.type === "listItem") {
    return (
      <li key={key}>
        {getNodeContent(node).map((child, index) => renderBlockNode(child, `${key}-${index}`))}
      </li>
    );
  }

  if (node.type === "blockquote") {
    return (
      <blockquote key={key} className="border-l-4 border-accent pl-5 italic">
        {getNodeContent(node).map((child, index) => renderBlockNode(child, `${key}-${index}`))}
      </blockquote>
    );
  }

  if (node.type === "codeBlock") {
    return (
      <pre key={key} className="overflow-x-auto bg-foreground p-4 text-background">
        <code>
          {getNodeContent(node)
            .map((child) => child.text)
            .join("\n")}
        </code>
      </pre>
    );
  }

  if (node.type === "image") {
    const image = getImageAttrs(node);

    if (!image) {
      return null;
    }

    return (
      <figure key={key}>
        <Image
          src={image.src}
          alt={image.alt}
          title={image.title}
          width={1200}
          height={675}
          sizes="(min-width: 768px) 768px, 100vw"
          className="aspect-video w-full object-cover"
        />
      </figure>
    );
  }

  return <Fragment key={key}>{renderInlineContent(node, key)}</Fragment>;
}

export function PublicRichText({ value, className }: PublicRichTextProps) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const root = value as RichTextNode;

  return (
    <div
      className={cn(
        publicTypography.editorialBody,
        "min-w-0 space-y-7 break-words [overflow-wrap:anywhere] [&_a]:break-words [&_a]:underline [&_blockquote_p]:text-[clamp(22px,3vw,34px)] [&_blockquote_p]:leading-[1.12] [&_code]:break-words [&_code]:bg-surface [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-ui [&_code]:[overflow-wrap:anywhere] [&_li]:my-2 [&_strong]:font-bold",
        className,
      )}
    >
      {getNodeContent(root).map((node, index) => renderBlockNode(node, String(index)))}
    </div>
  );
}
