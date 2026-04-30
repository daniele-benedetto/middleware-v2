"use client";

import { FileCode2, ImageIcon, Play } from "lucide-react";

import { CmsMediaImage } from "@/features/cms/media/components/media-image";
import { formatMediaDateTime, formatMediaSize } from "@/features/cms/media/utils/format";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { RouterOutputs } from "@/lib/trpc/types";

type MediaItem = RouterOutputs["media"]["list"]["items"][number];

type CmsMediaCardProps = {
  item: MediaItem;
  selected?: boolean;
  onPreview: () => void;
  selectable?: boolean;
};

export function CmsMediaCard({
  item,
  selected = false,
  onPreview,
  selectable = false,
}: CmsMediaCardProps) {
  const mediaText = i18n.cms.lists.media;

  return (
    <button
      type="button"
      onClick={onPreview}
      className={cn(
        "group relative block w-full overflow-hidden border bg-card-hover text-left transition-colors",
        selected ? "border-accent" : "border-foreground hover:border-accent",
      )}
    >
      {selectable ? (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-2 right-2 z-10 size-3 rounded-full border bg-white transition-colors",
            selected ? "border-accent bg-accent" : "border-foreground/40",
          )}
        />
      ) : null}
      <div className="relative aspect-[4/3] overflow-hidden bg-card-hover">
        {item.kind === "image" ? (
          <CmsMediaImage
            pathname={item.pathname}
            alt={item.fileName}
            sizes="(max-width: 768px) 100vw, (max-width: 1400px) 50vw, 33vw"
            className="object-cover"
          />
        ) : item.kind === "json" ? (
          <div className="flex h-full items-center justify-center px-5 text-center">
            <div className="space-y-2">
              <FileCode2 className="mx-auto size-10 text-accent" aria-hidden />
              <div className="font-ui text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                {mediaText.jsonPreviewLabel}
              </div>
            </div>
          </div>
        ) : item.kind === "audio" ? (
          <div className="flex h-full items-center justify-center px-5 text-center">
            <div className="space-y-2">
              <Play className="mx-auto size-10 text-accent" aria-hidden />
              <div className="font-ui text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                {mediaText.audioPreviewLabel}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center px-5 text-center">
            <div className="space-y-2">
              <ImageIcon className="mx-auto size-10 text-border" aria-hidden />
              <div className="font-ui text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                {mediaText.previewUnavailableTitle}
              </div>
            </div>
          </div>
        )}
      </div>
      {selected ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 ring-2 ring-accent ring-inset"
        />
      ) : null}
      <span className="sr-only">
        {item.fileName} {formatMediaSize(item.size)} {formatMediaDateTime(item.uploadedAt)}
      </span>
    </button>
  );
}
