"use client";

import { Mark, mergeAttributes, Node } from "@tiptap/core";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  LinkIcon,
  List,
  ListOrdered,
  MessageSquareQuote,
  Quote,
  Redo2,
  Strikethrough,
  Trash2,
  Undo2,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CmsMediaPickerDialog } from "@/features/cms/media/components/media-picker-dialog";
import { i18n } from "@/lib/i18n";
import { resolveCmsMediaPreviewUrl } from "@/lib/media/blob";
import { cn } from "@/lib/utils";

import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { ReactNode } from "react";

type CmsRichTextEditorProps = {
  value?: unknown;
  onChange?: (value: unknown) => void;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  fullHeight?: boolean;
  enableNotes?: boolean;
  allowHeadings?: boolean;
  allowBlockquote?: boolean;
  allowImages?: boolean;
  allowCodeBlock?: boolean;
  allowLinks?: boolean;
};

const emptyDoc = { type: "doc", content: [{ type: "paragraph" }] };

type NoteSelection = {
  pos: number;
  id: string;
  contentRich: unknown;
};

type NoteReferenceAttrs = {
  id?: unknown;
  contentRich?: unknown;
  number?: unknown;
};

function createNoteId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `note_${crypto.randomUUID()}`;
  }

  return `note_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function getNoteAttrs(node: ProseMirrorNode): NoteSelection | null {
  const attrs = node.attrs as NoteReferenceAttrs;

  if (typeof attrs.id !== "string" || !attrs.id) {
    return null;
  }

  return {
    pos: 0,
    id: attrs.id,
    contentRich: attrs.contentRich ?? emptyDoc,
  };
}

function syncNoteReferenceNumbers(editor: Editor) {
  let number = 1;
  let changed = false;
  const tr = editor.state.tr;

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== "noteReference") {
      return;
    }

    const attrs = node.attrs as NoteReferenceAttrs;
    if (attrs.number !== number) {
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, number });
      changed = true;
    }

    number += 1;
  });

  if (changed) {
    tr.setMeta("addToHistory", false);
    editor.view.dispatch(tr);
  }
}

const CmsImage = Node.create({
  name: "image",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "img[src]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const src =
      typeof HTMLAttributes.src === "string"
        ? resolveCmsMediaPreviewUrl(HTMLAttributes.src)
        : HTMLAttributes.src;

    return [
      "img",
      mergeAttributes(HTMLAttributes, {
        src,
        style: "display:block;width:100%;max-width:100%;height:auto;",
      }),
    ];
  },
});

const CmsLink = Mark.create({
  name: "link",
  inclusive: false,

  addAttributes() {
    return {
      href: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "a[href]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["a", mergeAttributes(HTMLAttributes), 0];
  },
});

const NoteReference = Node.create({
  name: "noteReference",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      id: { default: null },
      contentRich: { default: emptyDoc },
      number: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-note-reference]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const { contentRich: _contentRich, number, ...visibleAttributes } = HTMLAttributes;

    return [
      "span",
      mergeAttributes(visibleAttributes, {
        "data-note-reference": "true",
        "data-note-number": typeof number === "number" ? String(number) : "",
        class: "cms-note-reference",
        role: "button",
        tabindex: "0",
      }),
    ];
  },
});

const proseBaseClasses = cn(
  "prose prose-sm max-w-none font-editorial text-[16px] text-foreground leading-[1.6]",
  "min-w-0 break-words [overflow-wrap:anywhere] focus:outline-none",
  "px-3 py-2.5",
  "[&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:font-ui [&_h2]:text-[18px] [&_h2]:font-extrabold [&_h2]:uppercase [&_h2]:tracking-[0.08em] [&_h2]:text-foreground",
  "[&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:font-ui [&_h3]:text-[14px] [&_h3]:font-extrabold [&_h3]:uppercase [&_h3]:tracking-[0.08em] [&_h3]:text-foreground",
  "[&_p]:mb-2 [&_p:last-child]:mb-0",
  "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6",
  "[&_blockquote]:border-l-2 [&_blockquote]:border-foreground [&_blockquote]:pl-3 [&_blockquote]:italic",
  "[&_img]:my-4 [&_img]:block [&_img]:h-auto [&_img]:w-full [&_img]:max-w-full [&_img]:border [&_img]:border-foreground",
  "[&_code]:break-words [&_code]:font-ui [&_code]:text-[13px] [&_code]:bg-card-hover [&_code]:px-1 [&_code]:py-0.5",
  "[&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:bg-card-hover [&_pre]:p-3 [&_pre]:font-ui [&_pre]:text-[13px]",
  "[&_pre_code]:whitespace-pre-wrap [&_pre_code]:break-words [&_pre_code]:[overflow-wrap:anywhere]",
  "[&_strong]:font-bold",
  "[&_em]:italic",
  "[&_.cms-note-reference]:inline-flex [&_.cms-note-reference]:cursor-pointer [&_.cms-note-reference]:align-super [&_.cms-note-reference]:text-[11px] [&_.cms-note-reference]:font-bold [&_.cms-note-reference]:text-accent [&_.cms-note-reference]:outline-none",
  "[&_.cms-note-reference]:before:content-['['attr(data-note-number)']']",
);

function buildExtensions({
  enableNotes,
  allowHeadings,
  allowBlockquote,
  allowImages,
  allowCodeBlock,
  allowLinks,
}: Required<
  Pick<
    CmsRichTextEditorProps,
    | "enableNotes"
    | "allowHeadings"
    | "allowBlockquote"
    | "allowImages"
    | "allowCodeBlock"
    | "allowLinks"
  >
>) {
  return [
    StarterKit.configure({
      heading: allowHeadings ? { levels: [2, 3] } : false,
      blockquote: allowBlockquote ? undefined : false,
      codeBlock: allowCodeBlock ? undefined : false,
    }),
    ...(allowLinks ? [CmsLink] : []),
    ...(allowImages ? [CmsImage] : []),
    ...(enableNotes ? [NoteReference] : []),
  ];
}

export function CmsRichTextEditor({
  value,
  onChange,
  disabled,
  className,
  ariaLabel,
  fullHeight = false,
  enableNotes = false,
  allowHeadings = true,
  allowBlockquote = true,
  allowImages = true,
  allowCodeBlock = true,
  allowLinks = true,
}: CmsRichTextEditorProps) {
  const text = i18n.cms.richText;
  const proseClasses = cn(proseBaseClasses, fullHeight ? "min-h-full" : "min-h-40");
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteSelection, setNoteSelection] = useState<NoteSelection | null>(null);
  const [noteInsertPos, setNoteInsertPos] = useState<number | null>(null);
  const [noteContent, setNoteContent] = useState<unknown>(emptyDoc);

  const editor = useEditor({
    extensions: buildExtensions({
      enableNotes,
      allowHeadings,
      allowBlockquote,
      allowImages,
      allowCodeBlock,
      allowLinks,
    }),
    content: (value ?? emptyDoc) as never,
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: proseClasses,
        "aria-label": ariaLabel ?? text.defaultAriaLabel,
      },
      handleClickOn: (_view, pos, node) => {
        if (!enableNotes || node.type.name !== "noteReference") {
          return false;
        }

        const attrs = getNoteAttrs(node);
        if (!attrs) {
          return false;
        }

        setNoteSelection({ ...attrs, pos });
        setNoteContent(attrs.contentRich);
        setNoteDialogOpen(true);
        return true;
      },
    },
    onUpdate: ({ editor: nextEditor }) => {
      syncNoteReferenceNumbers(nextEditor);
      onChange?.(nextEditor.getJSON());
    },
    onCreate: ({ editor: nextEditor }) => {
      syncNoteReferenceNumbers(nextEditor);
    },
  });

  return (
    <div
      className={cn(
        "min-w-0 border border-foreground bg-card",
        fullHeight && "flex min-h-full flex-col",
        disabled && "border-border bg-card-hover text-border",
        className,
      )}
    >
      <CmsRichTextToolbar
        editor={editor}
        disabled={disabled}
        onOpenImagePicker={() => setImagePickerOpen(true)}
        onOpenNoteDialog={() => {
          if (!editor) return;
          setNoteSelection(null);
          setNoteInsertPos(editor.state.selection.from);
          setNoteContent(emptyDoc);
          setNoteDialogOpen(true);
        }}
        enableNotes={enableNotes}
        allowHeadings={allowHeadings}
        allowBlockquote={allowBlockquote}
        allowImages={allowImages}
        allowLinks={allowLinks}
      />
      <EditorContent
        editor={editor}
        className={cn(
          "min-w-0",
          fullHeight && "flex-1 [&_.ProseMirror]:min-h-full",
          "[&_.ProseMirror]:min-w-0",
        )}
      />
      {allowImages ? (
        <CmsMediaPickerDialog
          open={imagePickerOpen}
          onOpenChange={setImagePickerOpen}
          title={text.imageLibraryTitle}
          description={text.imageLibraryDescription}
          selectActionLabel={text.selectImage}
          allowedKinds={["image"]}
          selectionMode="select-inline"
          onSelectUrl={(url) => {
            editor
              ?.chain()
              .focus()
              .insertContent({
                type: "image",
                attrs: { src: resolveCmsMediaPreviewUrl(url), alt: "" },
              })
              .run();
          }}
        />
      ) : null}
      {enableNotes ? (
        <NoteDialog
          open={noteDialogOpen}
          onOpenChange={setNoteDialogOpen}
          value={noteContent}
          onChange={setNoteContent}
          isEditing={Boolean(noteSelection)}
          onDelete={() => {
            if (!editor || !noteSelection) return;
            const tr = editor.state.tr.delete(
              noteSelection.pos,
              noteSelection.pos + editor.state.doc.nodeAt(noteSelection.pos)!.nodeSize,
            );
            editor.view.dispatch(tr);
            onChange?.(editor.getJSON());
            setNoteDialogOpen(false);
          }}
          onSave={() => {
            if (!editor) return;

            if (noteSelection) {
              const node = editor.state.doc.nodeAt(noteSelection.pos);
              if (!node) return;
              const tr = editor.state.tr.setNodeMarkup(noteSelection.pos, undefined, {
                ...node.attrs,
                contentRich: noteContent,
              });
              editor.view.dispatch(tr);
              onChange?.(editor.getJSON());
            } else {
              editor
                .chain()
                .focus(noteInsertPos ?? undefined)
                .insertContent({
                  type: "noteReference",
                  attrs: { id: createNoteId(), contentRich: noteContent },
                })
                .run();
            }

            setNoteDialogOpen(false);
          }}
        />
      ) : null}
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
        active && "border-foreground bg-foreground text-background hover:bg-foreground",
        disabled && "cursor-not-allowed text-border hover:bg-transparent",
      )}
    >
      {children}
    </button>
  );
}

function CmsRichTextToolbar({
  editor,
  disabled,
  onOpenImagePicker,
  onOpenNoteDialog,
  enableNotes,
  allowHeadings,
  allowBlockquote,
  allowImages,
  allowLinks,
}: {
  editor: Editor | null;
  disabled?: boolean;
  onOpenImagePicker: () => void;
  onOpenNoteDialog: () => void;
  enableNotes: boolean;
  allowHeadings: boolean;
  allowBlockquote: boolean;
  allowImages: boolean;
  allowLinks: boolean;
}) {
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
      {allowLinks ? (
        <ToolbarButton
          label={text.link}
          onClick={() => {
            const previousHref = editor?.getAttributes("link").href;
            const href = window.prompt(
              text.linkPrompt,
              typeof previousHref === "string" ? previousHref : "",
            );

            if (href === null) return;
            if (!href.trim()) {
              editor?.chain().focus().unsetMark("link").run();
              return;
            }

            editor?.chain().focus().setMark("link", { href: href.trim() }).run();
          }}
          active={editor?.isActive("link")}
          disabled={isDisabled}
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
      ) : null}

      {allowHeadings ? <ToolbarSeparator /> : null}

      {allowHeadings ? (
        <>
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
        </>
      ) : null}

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
      {allowBlockquote ? (
        <ToolbarButton
          label={text.blockquote}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          active={editor?.isActive("blockquote")}
          disabled={isDisabled}
        >
          <Quote className="h-3.5 w-3.5" />
        </ToolbarButton>
      ) : null}

      {allowImages ? (
        <ToolbarButton label={text.image} onClick={onOpenImagePicker} disabled={isDisabled}>
          <ImageIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
      ) : null}

      {enableNotes ? (
        <ToolbarButton label={text.note} onClick={onOpenNoteDialog} disabled={isDisabled}>
          <MessageSquareQuote className="h-3.5 w-3.5" />
        </ToolbarButton>
      ) : null}

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

function NoteDialog({
  open,
  onOpenChange,
  value,
  onChange,
  isEditing,
  onSave,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: unknown;
  onChange: (value: unknown) => void;
  isEditing: boolean;
  onSave: () => void;
  onDelete: () => void;
}) {
  const text = i18n.cms.richText;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? text.editNoteTitle : text.addNoteTitle}</DialogTitle>
          <DialogDescription>{text.noteDescription}</DialogDescription>
        </DialogHeader>

        <CmsRichTextEditor
          value={value}
          onChange={onChange}
          ariaLabel={text.noteEditorAriaLabel}
          allowHeadings={false}
          allowBlockquote={false}
          allowImages={false}
          allowCodeBlock={false}
          allowLinks
        />

        <DialogFooter>
          {isEditing ? (
            <Button type="button" variant="destructive" onClick={onDelete} className="mr-auto">
              <Trash2 className="size-3.5" />
              {text.deleteNote}
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {text.cancelNote}
          </Button>
          <Button type="button" onClick={onSave}>
            {text.saveNote}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
