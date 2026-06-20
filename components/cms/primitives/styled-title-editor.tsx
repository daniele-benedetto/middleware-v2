"use client";

import { Highlighter } from "lucide-react";
import { useRef, useState } from "react";

import { cn } from "@/lib/utils";

import type { IssueTitleStyled } from "@/lib/server/modules/issues/schema";

type CmsStyledTitleEditorProps = {
  id: string;
  value: IssueTitleStyled;
  onChange: (value: IssueTitleStyled) => void;
  placeholder?: string;
  disabled?: boolean;
  accentLabel: string;
  ariaLabel: string;
};

type SelectionRange = {
  start: number;
  end: number;
};

const emptyTitleSegment = { text: "", tone: "default" as const };

const getPlainText = (segments: IssueTitleStyled) =>
  segments.map((segment) => segment.text).join("");

const normalizeSegments = (segments: IssueTitleStyled): IssueTitleStyled => {
  const normalized: IssueTitleStyled = [];

  for (const segment of segments) {
    if (!segment.text) {
      continue;
    }

    const previous = normalized.at(-1);
    if (previous?.tone === segment.tone) {
      previous.text += segment.text;
      continue;
    }

    normalized.push({ text: segment.text, tone: segment.tone ?? "default" });
  }

  return normalized.length > 0 ? normalized : [emptyTitleSegment];
};

const applyTone = (
  segments: IssueTitleStyled,
  range: SelectionRange,
  tone: "default" | "primary",
): IssueTitleStyled => {
  if (range.start === range.end) {
    return segments;
  }

  const next: IssueTitleStyled = [];
  let cursor = 0;

  for (const segment of segments) {
    const segmentStart = cursor;
    const segmentEnd = cursor + segment.text.length;
    cursor = segmentEnd;

    if (segmentEnd <= range.start || segmentStart >= range.end) {
      next.push(segment);
      continue;
    }

    const selectedStart = Math.max(range.start, segmentStart) - segmentStart;
    const selectedEnd = Math.min(range.end, segmentEnd) - segmentStart;
    const before = segment.text.slice(0, selectedStart);
    const selected = segment.text.slice(selectedStart, selectedEnd);
    const after = segment.text.slice(selectedEnd);

    if (before) {
      next.push({ text: before, tone: segment.tone });
    }

    if (selected) {
      next.push({ text: selected, tone });
    }

    if (after) {
      next.push({ text: after, tone: segment.tone });
    }
  }

  return normalizeSegments(next);
};

const getSelectionTone = (
  segments: IssueTitleStyled,
  range: SelectionRange | null,
): "default" | "primary" | null => {
  if (!range || range.start === range.end) {
    return null;
  }

  let cursor = 0;
  let selectedTone: "default" | "primary" | null = null;

  for (const segment of segments) {
    const segmentStart = cursor;
    const segmentEnd = cursor + segment.text.length;
    cursor = segmentEnd;

    if (segmentEnd <= range.start || segmentStart >= range.end) {
      continue;
    }

    if (selectedTone && selectedTone !== segment.tone) {
      return "default";
    }

    selectedTone = segment.tone;
  }

  return selectedTone;
};

const parseTitleMarkers = (title: string): IssueTitleStyled | null => {
  const segments: IssueTitleStyled = [];
  const markerPattern = /\[\[([^\]]+)\]\]/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = markerPattern.exec(title)) !== null) {
    const before = title.slice(cursor, match.index);
    if (before) {
      segments.push({ text: before, tone: "default" });
    }

    segments.push({ text: match[1], tone: "primary" });
    cursor = match.index + match[0].length;
  }

  const after = title.slice(cursor);
  if (after) {
    segments.push({ text: after, tone: "default" });
  }

  return segments.some((segment) => segment.tone === "primary")
    ? normalizeSegments(segments)
    : null;
};

const extractSegmentsFromDom = (root: HTMLElement): IssueTitleStyled => {
  const segments: IssueTitleStyled = [];

  const walk = (node: Node, inheritedTone: "default" | "primary") => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      if (text) {
        segments.push({ text, tone: inheritedTone });
      }
      return;
    }

    if (!(node instanceof HTMLElement)) {
      return;
    }

    const tone = node.dataset.tone === "primary" ? "primary" : inheritedTone;
    for (const child of node.childNodes) {
      walk(child, tone);
    }
  };

  for (const child of root.childNodes) {
    walk(child, "default");
  }

  return normalizeSegments(segments);
};

const getSelectionRange = (root: HTMLElement): SelectionRange | null => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
    return null;
  }

  const startRange = range.cloneRange();
  startRange.selectNodeContents(root);
  startRange.setEnd(range.startContainer, range.startOffset);

  const endRange = range.cloneRange();
  endRange.selectNodeContents(root);
  endRange.setEnd(range.endContainer, range.endOffset);

  const start = startRange.toString().length;
  const end = endRange.toString().length;

  return start <= end ? { start, end } : { start: end, end: start };
};

export function CmsStyledTitleEditor({
  id,
  value,
  onChange,
  placeholder,
  disabled,
  accentLabel,
  ariaLabel,
}: CmsStyledTitleEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<SelectionRange | null>(null);
  const [selectionRange, setSelectionRange] = useState<SelectionRange | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const plainText = getPlainText(value);
  const hasSelection = Boolean(selectionRange && selectionRange.start !== selectionRange.end);
  const selectedTone = getSelectionTone(value, selectionRange);
  const isAccentActive = selectedTone === "primary";

  const captureSelection = () => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    const nextSelection = getSelectionRange(editor);
    selectionRef.current = nextSelection;
    setSelectionRange(nextSelection);
  };

  const updateFromDom = () => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    onChange(extractSegmentsFromDom(editor));
  };

  const toggleAccent = () => {
    const selection = selectionRef.current;
    if (!selection || selection.start === selection.end) {
      return;
    }

    onChange(
      applyTone(
        value,
        selection,
        getSelectionTone(value, selection) === "primary" ? "default" : "primary",
      ),
    );
    selectionRef.current = null;
    setSelectionRange(null);
  };

  return (
    <div className="relative">
      <div className="absolute top-1/2 right-2 z-10 flex -translate-y-1/2 items-center">
        <button
          type="button"
          disabled={disabled || !hasSelection}
          onMouseDown={(event) => event.preventDefault()}
          onClick={toggleAccent}
          aria-label={accentLabel}
          aria-pressed={isAccentActive}
          title={accentLabel}
          className={cn(
            "inline-flex size-7 items-center justify-center rounded-[5px] border transition-colors",
            isAccentActive
              ? "border-accent bg-accent text-background hover:brightness-[0.9]"
              : hasSelection
                ? "border-foreground bg-white text-foreground hover:bg-card-hover"
                : "border-border bg-card-hover text-border",
          )}
        >
          <Highlighter className="size-3.5" aria-hidden />
        </button>
      </div>

      {!plainText && !isFocused ? (
        <div className="pointer-events-none absolute inset-x-3 top-2.5 pr-10 font-editorial text-[16px] leading-[1.2] text-border">
          {placeholder}
        </div>
      ) : null}
      <div
        id={id}
        ref={editorRef}
        role="textbox"
        aria-label={ariaLabel}
        aria-multiline="false"
        contentEditable={!disabled}
        suppressContentEditableWarning
        className={cn(
          "min-h-10 w-full rounded-[6px] border border-foreground bg-white py-2.5 pr-12 pl-3 font-editorial text-[16px] leading-[1.2] text-body-text outline-none",
          "focus-visible:border-accent focus-visible:ring-0 focus-visible:outline-none",
          disabled && "cursor-not-allowed border-border bg-card-hover text-border",
        )}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          captureSelection();
        }}
        onInput={updateFromDom}
        onKeyUp={captureSelection}
        onMouseUp={captureSelection}
        onPaste={(event) => {
          event.preventDefault();
          document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
        }}
      >
        {value.map((segment, index) => (
          <span
            key={`${segment.text}-${index}`}
            data-tone={segment.tone}
            className={segment.tone === "primary" ? "text-accent" : undefined}
          >
            {segment.text}
          </span>
        ))}
      </div>
    </div>
  );
}

export function getStyledTitlePlainText(value: IssueTitleStyled): string {
  return getPlainText(value);
}

export function hasStyledTitleAccent(value: IssueTitleStyled): boolean {
  return value.some((segment) => segment.tone === "primary");
}

export function createStyledTitleValue(
  title: string,
  titleStyled?: IssueTitleStyled | null,
): IssueTitleStyled {
  return normalizeSegments(
    titleStyled?.length
      ? titleStyled
      : (parseTitleMarkers(title) ?? [{ text: title, tone: "default" }]),
  );
}
