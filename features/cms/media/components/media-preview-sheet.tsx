"use client";

import { ExternalLink, ImageIcon, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { CmsConfirmDialog } from "@/components/cms/common";
import { CmsArticleListPanel } from "@/components/cms/common/article-list-panel";
import {
  CmsActionButton,
  CmsBody,
  CmsDisplay,
  CmsFormField,
  CmsMetaText,
  CmsTextInput,
} from "@/components/cms/primitives";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { CmsMediaImage } from "@/features/cms/media/components/media-image";
import { formatMediaDateTime, formatMediaSize } from "@/features/cms/media/utils/format";
import {
  cmsControlChromeClass,
  cmsMetaLabelAccentClass,
  cmsMetaLabelClass,
  cmsPanelClass,
  cmsTinyMetaClass,
} from "@/lib/cms/ui/variants";
import { i18n } from "@/lib/i18n";
import { buildCmsMediaAssetUrl } from "@/lib/media/blob";
import { cn } from "@/lib/utils";

import type { RouterOutputs } from "@/lib/trpc/types";

type MediaItem = RouterOutputs["media"]["list"]["items"][number];

type MediaPreviewDetailRowProps = {
  label: string;
  value: string;
  breakAll?: boolean;
};

type CmsMediaPreviewSheetProps = {
  item: MediaItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRename: (item: MediaItem, nextName: string) => Promise<void>;
  onDelete: (item: MediaItem) => Promise<void>;
  isRenaming: boolean;
  isDeleting: boolean;
  selectActionLabel?: string;
  selectDisabled?: boolean;
  onSelect?: () => void;
};

function getMediaTypeLabel(item: MediaItem) {
  const mediaText = i18n.cms.lists.media;

  if (item.kind === "image") {
    return mediaText.typeImage;
  }

  if (item.kind === "audio") {
    return mediaText.typeAudio;
  }

  if (item.kind === "json") {
    return mediaText.typeJson;
  }

  return mediaText.typeOther;
}

function MediaPreviewDetailRow({ label, value, breakAll = false }: MediaPreviewDetailRowProps) {
  return (
    <div className="grid gap-1 border-b border-border py-3 last:border-b-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
      <div className={cmsTinyMetaClass}>{label}</div>
      <div
        className={cn(
          "font-ui text-[12px] font-bold uppercase tracking-[0.06em] text-foreground",
          breakAll && "break-all",
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function CmsMediaPreviewSheet({
  item,
  open,
  onOpenChange,
  onRename,
  onDelete,
  isRenaming,
  isDeleting,
  selectActionLabel,
  selectDisabled = false,
  onSelect,
}: CmsMediaPreviewSheetProps) {
  const mediaText = i18n.cms.lists.media;
  const typeLabel = getMediaTypeLabel(item);
  const relatedArticles = useMemo(() => {
    return [
      ...new Map(item.articleReferences.map((reference) => [reference.id, reference])).values(),
    ].map((reference) => ({
      id: reference.id,
      title: reference.title,
      href: `/cms/articles/${reference.id}/edit`,
    }));
  }, [item.articleReferences]);
  const [nextBaseName, setNextBaseName] = useState(item.baseName);
  const [jsonPreview, setJsonPreview] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(item.kind === "json");
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || item.kind !== "json") {
      return;
    }

    const controller = new AbortController();

    void fetch(buildCmsMediaAssetUrl(item.pathname), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(mediaText.previewError);
        }

        const text = await response.text();

        try {
          setJsonPreview(JSON.stringify(JSON.parse(text), null, 2));
        } catch {
          setJsonPreview(text);
        }
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }

        setPreviewError(error instanceof Error ? error.message : mediaText.previewError);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsPreviewLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [item.kind, item.pathname, mediaText.previewError, open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-190 border-l-2 border-foreground p-0">
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-4 border-b-2 border-foreground bg-background px-5 py-4">
            <div className="min-w-0 space-y-2">
              <CmsMetaText variant="category">{typeLabel}</CmsMetaText>
              <SheetTitle className="truncate text-[18px]! leading-none! tracking-[-0.02em]!">
                {item.fileName}
              </SheetTitle>
              <SheetDescription className="block text-[10px]!">
                {formatMediaSize(item.size)} / {formatMediaDateTime(item.uploadedAt)}
              </SheetDescription>
            </div>
            <SheetClose
              aria-label={i18n.cms.common.close}
              className={cn(
                "inline-flex size-8 shrink-0 items-center justify-center bg-transparent",
                cmsControlChromeClass,
                "transition-colors hover:bg-surface-hover",
              )}
            >
              <X className="size-3.5" aria-hidden />
            </SheetClose>
          </div>

          <div className="cms-scroll min-h-0 flex-1 overflow-y-auto bg-(--bg-main) px-5 py-5">
            <div className="space-y-5">
              <section className={cn("overflow-hidden", cmsPanelClass)}>
                <div className="flex items-center justify-between border-b border-foreground px-4 py-3">
                  <CmsMetaText variant="category">{mediaText.previewCta}</CmsMetaText>
                  <span className={cmsTinyMetaClass}>{typeLabel}</span>
                </div>
                <div className="relative bg-card-hover">
                  {item.kind === "image" ? (
                    <div className="relative aspect-16/10 min-h-70">
                      <CmsMediaImage
                        pathname={item.pathname}
                        alt={item.fileName}
                        sizes="(max-width: 768px) 100vw, 60vw"
                        priority
                        className="object-contain"
                      />
                    </div>
                  ) : item.kind === "audio" ? (
                    <div className="space-y-4 p-5">
                      <div className="rounded-[8px] border border-foreground bg-card p-4">
                        <audio
                          controls
                          preload="metadata"
                          className="w-full"
                          src={buildCmsMediaAssetUrl(item.pathname)}
                        >
                          {mediaText.previewUnavailableDescription}
                        </audio>
                      </div>
                    </div>
                  ) : item.kind === "json" ? (
                    <div className="space-y-3 p-5">
                      {isPreviewLoading ? (
                        <div className={cmsMetaLabelClass}>{mediaText.previewLoading}</div>
                      ) : previewError ? (
                        <div className={cmsMetaLabelAccentClass}>{previewError}</div>
                      ) : (
                        <pre className="max-h-120 overflow-auto rounded-[6px] bg-card-hover p-4 font-technical text-[12px] leading-[1.55] text-foreground whitespace-pre-wrap wrap-break-word">
                          {jsonPreview}
                        </pre>
                      )}
                    </div>
                  ) : (
                    <div className="flex min-h-60 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
                      <ImageIcon className="size-10 text-border" aria-hidden />
                      <CmsDisplay as="h3" size="h3" className="text-[20px]! tracking-[-0.02em]!">
                        {mediaText.previewUnavailableTitle}
                      </CmsDisplay>
                      <CmsBody size="sm" tone="muted" className="max-w-95">
                        {mediaText.previewUnavailableDescription}
                      </CmsBody>
                    </div>
                  )}
                </div>
              </section>

              <section className={cn("space-y-3 p-4", cmsPanelClass)}>
                <CmsMetaText variant="category">{mediaText.actionsTitle}</CmsMetaText>
                <div
                  className={cn(
                    "grid gap-2",
                    onSelect && selectActionLabel ? "sm:grid-cols-3" : "sm:grid-cols-2",
                  )}
                >
                  {onSelect && selectActionLabel ? (
                    <CmsActionButton
                      variant="primary-accent"
                      size="md"
                      className="w-full"
                      disabled={selectDisabled || isDeleting || isRenaming}
                      onClick={onSelect}
                    >
                      {selectActionLabel}
                    </CmsActionButton>
                  ) : null}
                  <CmsActionButton
                    variant="outline"
                    size="md"
                    className="w-full"
                    disabled={isDeleting || isRenaming}
                    onClick={() => {
                      window.open(
                        buildCmsMediaAssetUrl(item.pathname),
                        "_blank",
                        "noopener,noreferrer",
                      );
                    }}
                  >
                    <ExternalLink className="size-3.5" />
                    {mediaText.openCta}
                  </CmsActionButton>
                  <CmsConfirmDialog
                    triggerLabel={mediaText.deleteCta}
                    triggerIcon={<Trash2 className="size-3.5" aria-hidden />}
                    triggerClassName="w-full justify-center bg-transparent px-5 py-2.5 text-[14.5px] hover:bg-surface-hover"
                    triggerDisabled={isDeleting || isRenaming}
                    title={mediaText.deleteConfirmTitle}
                    description={mediaText.deleteConfirmDescription(item.fileName)}
                    tone="danger"
                    onConfirm={() => onDelete(item)}
                  />
                </div>
              </section>

              <section className={cn("space-y-3 p-4", cmsPanelClass)}>
                <CmsMetaText variant="category">{mediaText.detailsTitle}</CmsMetaText>
                <div>
                  <MediaPreviewDetailRow label={mediaText.uploadNameLabel} value={item.fileName} />
                  <MediaPreviewDetailRow
                    label={mediaText.metadataPath}
                    value={item.pathname}
                    breakAll
                  />
                  <MediaPreviewDetailRow label={mediaText.metadataType} value={typeLabel} />
                  <MediaPreviewDetailRow
                    label={mediaText.metadataSize}
                    value={formatMediaSize(item.size)}
                  />
                  <MediaPreviewDetailRow
                    label={mediaText.metadataUploadedAt}
                    value={formatMediaDateTime(item.uploadedAt)}
                  />
                </div>
              </section>

              <section className={cn("space-y-3 p-4", cmsPanelClass)}>
                <CmsMetaText variant="category">{mediaText.renameCta}</CmsMetaText>
                <CmsFormField
                  label={mediaText.uploadNameLabel}
                  htmlFor="cms-media-rename-input"
                  hint={mediaText.renameHint}
                >
                  <CmsTextInput
                    id="cms-media-rename-input"
                    tone="ui"
                    value={nextBaseName}
                    disabled={isRenaming || isDeleting}
                    onChange={(event) => setNextBaseName(event.target.value)}
                  />
                </CmsFormField>
                <div className="flex justify-end">
                  <CmsActionButton
                    variant="outline"
                    size="md"
                    disabled={
                      isDeleting ||
                      isRenaming ||
                      nextBaseName.trim().length === 0 ||
                      nextBaseName.trim() === item.baseName
                    }
                    onClick={() => {
                      void onRename(item, nextBaseName);
                    }}
                  >
                    {mediaText.renameCta}
                  </CmsActionButton>
                </div>
              </section>

              <CmsArticleListPanel
                title={i18n.cms.navigation.articles}
                emptyText={mediaText.referencesEmpty}
                articles={relatedArticles}
              />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
