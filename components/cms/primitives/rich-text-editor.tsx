"use client";

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from "lucide-react";

import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

type CmsRichTextEditorProps = {
  value?: unknown;
  onChange?: (value: unknown) => void;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  fullHeight?: boolean;
};

const emptyDoc = { type: "doc", content: [{ type: "paragraph" }] };

const proseBaseClasses = cn(
  "prose prose-sm max-w-none font-editorial text-[16px] text-foreground leading-[1.6]",
  "focus:outline-none",
  "px-3 py-2.5",
  "[&_h2]:font-ui [&_h2]:text-[18px] [&_h2]:uppercase [&_h2]:tracking-[0.04em] [&_h2]:text-foreground [&_h2]:mt-4 [&_h2]:mb-2",
  "[&_h3]:font-ui [&_h3]:text-[14px] [&_h3]:uppercase [&_h3]:tracking-[0.04em] [&_h3]:text-foreground [&_h3]:mt-3 [&_h3]:mb-1.5",
  "[&_p]:mb-2 [&_p:last-child]:mb-0",
  "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6",
  "[&_blockquote]:border-l-2 [&_blockquote]:border-foreground [&_blockquote]:pl-3 [&_blockquote]:italic",
  "[&_code]:font-ui [&_code]:text-[13px] [&_code]:bg-card-hover [&_code]:px-1 [&_code]:py-0.5",
  "[&_pre]:bg-card-hover [&_pre]:p-3 [&_pre]:font-ui [&_pre]:text-[13px] [&_pre]:overflow-x-auto",
  "[&_strong]:font-bold",
  "[&_em]:italic",
);

export function CmsRichTextEditor({
  value,
  onChange,
  disabled,
  className,
  ariaLabel,
  fullHeight = false,
}: CmsRichTextEditorProps) {
  const text = i18n.cms.richText;
  const proseClasses = cn(proseBaseClasses, fullHeight ? "min-h-full" : "min-h-40");

  const editor = useEditor({
    extensions: [StarterKit],
    content: (value ?? emptyDoc) as never,
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: proseClasses,
        "aria-label": ariaLabel ?? text.defaultAriaLabel,
      },
    },
    onUpdate: ({ editor: nextEditor }) => {
      onChange?.(nextEditor.getJSON());
    },
  });

  return (
    <div
      className={cn(
        "border border-foreground bg-white",
        fullHeight && "flex min-h-0 flex-1 flex-col",
        disabled && "border-border bg-card-hover text-border",
        className,
      )}
    >
      <CmsRichTextToolbar editor={editor} disabled={disabled} />
      <EditorContent
        editor={editor}
        className={cn(fullHeight && "min-h-0 flex-1 [&_.ProseMirror]:min-h-full")}
      />
    </div>
  );
}

type ToolbarButtonProps = {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: ReactNode;
};

function ToolbarButton({ onClick, active, disabled, label, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center border border-transparent text-foreground transition-colors",
        "hover:bg-card-hover focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1",
        active && "border-foreground bg-foreground text-white hover:bg-foreground",
        disabled && "cursor-not-allowed text-border hover:bg-transparent",
      )}
    >
      {children}
    </button>
  );
}

function CmsRichTextToolbar({ editor, disabled }: { editor: Editor | null; disabled?: boolean }) {
  const text = i18n.cms.richText;
  const isDisabled = disabled || !editor;

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-foreground p-1.5">
      <ToolbarButton
        label={text.bold}
        onClick={() => editor?.chain().focus().toggleBold().run()}
        active={editor?.isActive("bold")}
        disabled={isDisabled}
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label={text.italic}
        onClick={() => editor?.chain().focus().toggleItalic().run()}
        active={editor?.isActive("italic")}
        disabled={isDisabled}
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label={text.strike}
        onClick={() => editor?.chain().focus().toggleStrike().run()}
        active={editor?.isActive("strike")}
        disabled={isDisabled}
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label={text.inlineCode}
        onClick={() => editor?.chain().focus().toggleCode().run()}
        active={editor?.isActive("code")}
        disabled={isDisabled}
      >
        <Code className="h-3.5 w-3.5" />
      </ToolbarButton>

      <ToolbarSeparator />

      <ToolbarButton
        label={text.heading2}
        onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor?.isActive("heading", { level: 2 })}
        disabled={isDisabled}
      >
        <Heading2 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label={text.heading3}
        onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor?.isActive("heading", { level: 3 })}
        disabled={isDisabled}
      >
        <Heading3 className="h-3.5 w-3.5" />
      </ToolbarButton>

      <ToolbarSeparator />

      <ToolbarButton
        label={text.bulletList}
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
        active={editor?.isActive("bulletList")}
        disabled={isDisabled}
      >
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label={text.orderedList}
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        active={editor?.isActive("orderedList")}
        disabled={isDisabled}
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label={text.blockquote}
        onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        active={editor?.isActive("blockquote")}
        disabled={isDisabled}
      >
        <Quote className="h-3.5 w-3.5" />
      </ToolbarButton>

      <ToolbarSeparator />

      <ToolbarButton
        label={text.undo}
        onClick={() => editor?.chain().focus().undo().run()}
        disabled={isDisabled || !editor?.can().undo()}
      >
        <Undo2 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label={text.redo}
        onClick={() => editor?.chain().focus().redo().run()}
        disabled={isDisabled || !editor?.can().redo()}
      >
        <Redo2 className="h-3.5 w-3.5" />
      </ToolbarButton>
    </div>
  );
}

function ToolbarSeparator() {
  return <span className="mx-1 h-5 w-px bg-border" aria-hidden />;
}
