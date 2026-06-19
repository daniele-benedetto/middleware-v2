"use client";

import dynamic from "next/dynamic";

import { cmsMetaLabelClass } from "@/lib/cms/ui/variants";
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
          "flex min-h-40 w-full flex-1 items-center justify-center border border-foreground bg-card-hover",
          cmsMetaLabelClass,
        )}
      />
    ),
  },
);

export const CmsRichTextEditor = CmsRichTextEditorImpl;
