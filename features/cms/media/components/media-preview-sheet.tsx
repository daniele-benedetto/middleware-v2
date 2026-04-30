"use client";

import { ExternalLink, ImageIcon, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { CmsConfirmDialog } from "@/components/cms/common";
import { CmsArticleListPanel } from "@/components/cms/common/article-list-panel";
import {
  CmsActionButton,
  CmsBody,
  CmsDisplay,
  CmsFormField,
  CmsMetaRow,
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
import { i18n } from "@/lib/i18n";
import { buildCmsMediaAssetUrl } from "@/lib/media/blob";
import { cn } from "@/lib/utils";

import type { RouterOutputs } from "@/lib/trpc/types";

type MediaItem = RouterOutputs["media"]["list"]["items"][number];

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
  const relatedArticles = useMemo(() => {
    return [
      ...new Map(item.articleReferences.map((reference) => [reference.id, reference])).values(),
    ].map((reference) => ({
      id: reference.id,
      title: reference.title,
      isFeatured: false,
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
      <SheetContent side="right" className="w-full max-w-180 border-l-[3px] border-foreground p-0">
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-4 border-b-[3px] border-foreground bg-background px-5 py-4">
            <div>
              <SheetTitle className="text-[16px]! leading-none!">{item.fileName}</SheetTitle>
              <SheetDescription className="mt-2 block break-all text-[10px]!">
                {item.pathname}
              </SheetDescription>
            </div>
            <SheetClose
              aria-label={i18n.cms.common.close}
              className={cn(
                "inline-flex size-8 shrink-0 items-center justify-center border border-foreground bg-transparent",
                "transition-colors hover:bg-card-hover",
              )}
            >
              <X className="size-3.5" aria-hidden />
            </SheetClose>
          </div>

          <div className="cms-scroll min-h-0 flex-1 overflow-y-auto bg-(--bg-main) px-5 py-5">
            <div className="space-y-5">
              <section className="space-y-3">
                <div className="relative overflow-hidden border border-foreground bg-white">
                  {item.kind === "image" ? (
                    <div className="relative aspect-[16/10]">
                      <CmsMediaImage
                        pathname={item.pathname}
                        alt={item.fileName}
                        sizes="(max-width: 768px) 100vw, 60vw"
                        priority
                        className="object-contain bg-card-hover"
                      />
                    </div>
                  ) : item.kind === "audio" ? (
                    <div className="space-y-4 p-4">
                      <CmsMetaText variant="category">{mediaText.audioPreviewLabel}</CmsMetaText>
                      <div className="border border-foreground bg-card-hover p-4">
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
                    <div className="space-y-3 p-4">
                      <CmsMetaText variant="category">{mediaText.jsonPreviewLabel}</CmsMetaText>
                      {isPreviewLoading ? (
                        <div className="font-ui text-[11px] uppercase tracking-[0.04em] text-muted-foreground">
                          {mediaText.previewLoading}
                        </div>
                      ) : previewError ? (
                        <div className="font-ui text-[11px] uppercase tracking-[0.04em] text-accent">
                          {previewError}
                        </div>
                      ) : (
                        <pre className="max-h-120 overflow-auto bg-card-hover p-4 font-ui text-[12px] leading-[1.55] text-foreground whitespace-pre-wrap break-words">
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

                <div className="flex flex-wrap gap-2">
                  <CmsMetaRow
                    label={mediaText.metadataType}
                    value={
                      item.kind === "image"
                        ? mediaText.typeImage
                        : item.kind === "audio"
                          ? mediaText.typeAudio
                          : item.kind === "json"
                            ? mediaText.typeJson
                            : mediaText.typeOther
                    }
                  />
                  <CmsMetaRow label={mediaText.metadataSize} value={formatMediaSize(item.size)} />
                  <CmsMetaRow
                    label={mediaText.metadataUploadedAt}
                    value={formatMediaDateTime(item.uploadedAt)}
                  />
                  <CmsMetaRow
                    label={mediaText.referencesTitle}
                    value={mediaText.referencesCount(relatedArticles.length)}
                  />
                </div>
              </section>

              <section className="space-y-3 border border-foreground bg-white p-4">
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
                <div className="flex flex-wrap gap-2.5">
                  {onSelect && selectActionLabel ? (
                    <CmsActionButton
                      variant="primary-accent"
                      size="md"
                      disabled={selectDisabled || isDeleting || isRenaming}
                      onClick={onSelect}
                    >
                      {selectActionLabel}
                    </CmsActionButton>
                  ) : null}
                  <CmsActionButton
                    variant="outline"
                    size="md"
                    disabled={isDeleting || isRenaming || nextBaseName.trim().length === 0}
                    onClick={() => {
                      void onRename(item, nextBaseName);
                    }}
                  >
                    {mediaText.renameCta}
                  </CmsActionButton>
                  <CmsActionButton
                    variant="outline"
                    size="md"
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
                    triggerDisabled={isDeleting || isRenaming}
                    title={mediaText.deleteConfirmTitle}
                    description={mediaText.deleteConfirmDescription(item.fileName)}
                    tone="danger"
                    onConfirm={() => onDelete(item)}
                  />
                </div>
              </section>

              <CmsArticleListPanel
                title={i18n.cms.navigation.articles}
                emptyText={mediaText.referencesEmpty}
                featuredAriaLabel={i18n.cms.lists.issues.articlesPanelFeaturedAria}
                articles={relatedArticles}
              />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
