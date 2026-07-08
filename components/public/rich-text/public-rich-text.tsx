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

type NoteEntry = {
  number: number;
  contentRich: RichTextNode;
  node: RichTextNode;
};

type RenderContext = {
  noteNumbers: WeakMap<RichTextNode, number>;
  renderNoteReferences: boolean;
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

function getNoteContentRich(node: RichTextNode): RichTextNode | null {
  if (!node.attrs || typeof node.attrs !== "object") {
    return null;
  }

  const contentRich = (node.attrs as { contentRich?: unknown }).contentRich;

  if (!contentRich || typeof contentRich !== "object") {
    return null;
  }

  return contentRich as RichTextNode;
}

function collectNotes(
  node: RichTextNode,
  entries: NoteEntry[],
  noteNumbers: WeakMap<RichTextNode, number>,
) {
  if (node.type === "noteReference") {
    const contentRich = getNoteContentRich(node);

    if (contentRich) {
      const number = entries.length + 1;
      entries.push({ number, contentRich, node });
      noteNumbers.set(node, number);
    }
  }

  getNodeContent(node).forEach((child) => collectNotes(child, entries, noteNumbers));
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

function renderInlineNode(node: RichTextNode, key: string, context: RenderContext): ReactNode {
  if (typeof node.text === "string") {
    return <Fragment key={key}>{renderMarks(node.text, node.marks)}</Fragment>;
  }

  if (node.type === "hardBreak") {
    return <br key={key} />;
  }

  if (node.type === "noteReference") {
    if (!context.renderNoteReferences) {
      return null;
    }

    const number = context.noteNumbers.get(node);

    if (!number) {
      return null;
    }

    return (
      <sup key={key} id={`note-ref-${number}`} className="scroll-mt-24 align-super">
        <a
          href={`#note-${number}`}
          aria-label={`Vai alla nota ${number}`}
          className="font-heading text-[0.62em] font-black text-accent no-underline hover:text-foreground"
        >
          [{number}]
        </a>
      </sup>
    );
  }

  return renderInlineContent(node, key, context);
}

function renderInlineContent(
  node: RichTextNode,
  keyPrefix: string,
  context: RenderContext,
): ReactNode {
  return getNodeContent(node).map((child, index) =>
    renderInlineNode(child, `${keyPrefix}-${index}`, context),
  );
}

function renderBlockChildren(node: RichTextNode, key: string, context: RenderContext): ReactNode {
  return getNodeContent(node).map((child, index) =>
    renderBlockNode(child, `${key}-${index}`, context),
  );
}

function renderBlockNode(node: RichTextNode, key: string, context: RenderContext): ReactNode {
  if (!isPublicRichTextNodeType(node.type)) {
    return <Fragment key={key}>{renderInlineContent(node, key, context)}</Fragment>;
  }

  if (node.type === "paragraph") {
    return <p key={key}>{renderInlineContent(node, key, context)}</p>;
  }

  if (node.type === "heading") {
    const level = getHeadingLevel(node);
    const className = cn(
      "font-heading font-black tracking-[-0.035em] text-foreground",
      level === 2 ? "text-[clamp(30px,4vw,54px)] leading-[0.95]" : "text-2xl leading-tight",
    );

    return level === 3 ? (
      <h3 key={key} className={className}>
        {renderInlineContent(node, key, context)}
      </h3>
    ) : (
      <h2 key={key} className={className}>
        {renderInlineContent(node, key, context)}
      </h2>
    );
  }

  if (node.type === "bulletList") {
    return (
      <ul key={key} className="list-disc pl-6">
        {renderBlockChildren(node, key, context)}
      </ul>
    );
  }

  if (node.type === "orderedList") {
    return (
      <ol key={key} className="list-decimal pl-6">
        {renderBlockChildren(node, key, context)}
      </ol>
    );
  }

  if (node.type === "listItem") {
    return <li key={key}>{renderBlockChildren(node, key, context)}</li>;
  }

  if (node.type === "blockquote") {
    return (
      <blockquote key={key} className="border-l-4 border-accent pl-5 italic">
        {renderBlockChildren(node, key, context)}
      </blockquote>
    );
  }

  if (node.type === "codeBlock") {
    return (
      <pre key={key} className="overflow-x-auto bg-foreground p-4 text-background">
        <code>
          {getNodeContent(node)
            .map((child) => (typeof child.text === "string" ? child.text : ""))
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

  if (node.type === "noteReference") {
    return <Fragment key={key}>{renderInlineNode(node, key, context)}</Fragment>;
  }

  return <Fragment key={key}>{renderInlineContent(node, key, context)}</Fragment>;
}

function renderNotes(entries: NoteEntry[], context: RenderContext): ReactNode {
  if (entries.length === 0) {
    return null;
  }

  const noteContentContext = { ...context, renderNoteReferences: false };

  return (
    <section
      className="mt-12 border-t border-foreground pt-6"
      aria-labelledby="article-notes-title"
    >
      <h2
        id="article-notes-title"
        className="font-heading text-[13px] font-black tracking-[0.12em] text-foreground uppercase"
      >
        Note
      </h2>
      <ol className="mt-5 space-y-4 font-editorial text-[15px] leading-normal text-body-text">
        {entries.map((entry) => (
          <li
            key={`${entry.number}-${entry.node.attrs && typeof entry.node.attrs === "object" ? (entry.node.attrs as { id?: unknown }).id : "note"}`}
            id={`note-${entry.number}`}
            className="scroll-mt-24"
          >
            <a
              href={`#note-ref-${entry.number}`}
              aria-label={`Torna al riferimento della nota ${entry.number}`}
              className="mr-2 font-heading text-[12px] font-black text-accent no-underline hover:text-foreground"
            >
              {entry.number}.
            </a>
            <div className="inline [&_a]:underline [&_p]:inline">
              {getNodeContent(entry.contentRich).map((node, index) =>
                renderBlockNode(node, `note-${entry.number}-${index}`, noteContentContext),
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function PublicRichText({ value, className }: PublicRichTextProps) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const root = value as RichTextNode;
  const noteEntries: NoteEntry[] = [];
  const noteNumbers = new WeakMap<RichTextNode, number>();
  collectNotes(root, noteEntries, noteNumbers);
  const context: RenderContext = { noteNumbers, renderNoteReferences: true };

  return (
    <div
      className={cn(
        publicTypography.editorialBody,
        "min-w-0 space-y-7 break-words [overflow-wrap:anywhere] [&_a]:break-words [&_a]:underline [&_blockquote_p]:text-[clamp(18px,1.5vw,22px)] [&_blockquote_p]:leading-[1.45] [&_code]:break-words [&_code]:bg-surface [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-ui [&_code]:[overflow-wrap:anywhere] [&_li]:my-2 [&_strong]:font-bold",
        className,
      )}
    >
      {getNodeContent(root).map((node, index) => renderBlockNode(node, String(index), context))}
      {renderNotes(noteEntries, context)}
    </div>
  );
}
