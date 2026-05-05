"use client";

import dynamic from "next/dynamic";

import { cn } from "@/lib/utils";

import type { ComponentProps } from "react";

type CmsRichTextEditorComponent = typeof import("./rich-text-editor").CmsRichTextEditor;

const CmsRichTextEditorImpl = dynamic<ComponentProps<CmsRichTextEditorComponent>>(
  () => import("./rich-text-editor").then((mod) => mod.CmsRichTextEditor),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden
        className={cn(
          "flex min-h-40 items-center justify-center border border-foreground bg-card-hover",
          "font-ui text-[11px] uppercase tracking-[0.04em] text-muted-foreground",
        )}
      />
    ),
  },
);

export const CmsRichTextEditor = CmsRichTextEditorImpl;
