"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { CmsEmptyState, CmsErrorState } from "@/components/cms/common";
import { CmsActionButton, CmsSearchBar, CmsSurface, cmsToast } from "@/components/cms/primitives";
import { CmsMediaCard } from "@/features/cms/media/components/media-card";
import { CmsMediaLibraryLoading } from "@/features/cms/media/components/media-library-loading";
import { CmsMediaPreviewSheet } from "@/features/cms/media/components/media-preview-sheet";
import { CmsMediaUploadDialog } from "@/features/cms/media/components/media-upload-dialog";
import { invalidateArticlesAfterMutation, mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import { cmsMediaDefaultKinds } from "@/lib/media/blob";
import { trpc } from "@/lib/trpc/react";

import type { CmsSupportedMediaKind } from "@/lib/media/blob";
import type { RouterOutputs } from "@/lib/trpc/types";
import type { PutBlobResult } from "@vercel/blob";

type MediaListInitialData = RouterOutputs["media"]["list"];
type MediaItem = MediaListInitialData["items"][number];

const emptyMediaItems: MediaItem[] = [];

type CmsMediaLibraryProps = {
  initialData?: MediaListInitialData;
  allowedKinds?: CmsSupportedMediaKind[];
  uploadButtonLabel?: string;
  selectActionLabel?: string;
  interactionMode?: "preview" | "select-inline";
  onSelectItem?: (item: MediaItem) => Promise<void> | void;
  onSelectionChange?: (item: MediaItem | null) => void;
  onBlobUploaded?: (blob: PutBlobResult) => Promise<void> | void;
  emptyTitle?: string;
  emptyDescription?: string;
};

export function CmsMediaLibrary({
  initialData,
  allowedKinds = cmsMediaDefaultKinds,
  uploadButtonLabel,
  selectActionLabel,
  interactionMode = "preview",
  onSelectItem,
  onSelectionChange,
  onBlobUploaded,
  emptyTitle,
  emptyDescription,
}: CmsMediaLibraryProps) {
  const text = i18n.cms;
  const mediaText = text.lists.media;
  const trpcUtils = trpc.useUtils();
  const listQuery = trpc.media.list.useQuery(undefined, initialData ? { initialData } : undefined);
  const renameMutation = trpc.media.rename.useMutation();
  const deleteMutation = trpc.media.delete.useMutation();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [selectedPathname, setSelectedPathname] = useState<string | null>(null);
  const [selectingPathname, setSelectingPathname] = useState<string | null>(null);
  const deferredSearchValue = useDeferredValue(searchValue);

  const items = listQuery.data?.items ?? emptyMediaItems;
  const visibleItems = useMemo(
    () => items.filter((item) => allowedKinds.includes(item.kind as CmsSupportedMediaKind)),
    [allowedKinds, items],
  );
  const filteredItems = useMemo(() => {
    const normalizedSearch = deferredSearchValue.trim().toLowerCase();

    if (!normalizedSearch) {
      return visibleItems;
    }

    return visibleItems.filter((item) => {
      const haystack = `${item.fileName} ${item.pathname}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [deferredSearchValue, visibleItems]);

  const selectedItem = visibleItems.find((item) => item.pathname === selectedPathname) ?? null;

  useEffect(() => {
    onSelectionChange?.(selectedItem);
  }, [onSelectionChange, selectedItem]);

  const refreshMedia = async (articleIds?: string[]) => {
    await Promise.all([
      trpcUtils.media.list.invalidate(),
      articleIds && articleIds.length > 0
        ? invalidateArticlesAfterMutation(trpcUtils, { ids: articleIds })
        : Promise.resolve(),
    ]);
  };

  const handleUploaded = async (blob: PutBlobResult) => {
    await refreshMedia();
    setSelectedPathname(blob.pathname);

    if (onBlobUploaded) {
      await onBlobUploaded(blob);
      return;
    }

    cmsToast.info(mediaText.uploadCompleted);
  };

  const handleRename = async (item: MediaItem, nextName: string) => {
    try {
      const result = await renameMutation.mutateAsync({
        url: item.url,
        name: nextName,
      });

      await refreshMedia(result.articleIds);
      setSelectedPathname(result.item.pathname);
      cmsToast.info(
        result.articleIds.length > 0
          ? mediaText.renameCompletedWithArticles(result.articleIds.length)
          : mediaText.renameCompleted,
      );
    } catch (error) {
      const mapped = mapTrpcErrorToCmsUiMessage(error);
      cmsToast.error(mapped.description, mapped.title);
    }
  };

  const handleDelete = async (item: MediaItem) => {
    try {
      const result = await deleteMutation.mutateAsync({ url: item.url });
      await refreshMedia(result.articleIds);
      setSelectedPathname(null);
      cmsToast.info(
        result.articleIds.length > 0
          ? mediaText.deleteCompletedWithArticles(result.articleIds.length)
          : mediaText.deleteCompleted,
      );
    } catch (error) {
      const mapped = mapTrpcErrorToCmsUiMessage(error);
      cmsToast.error(mapped.description, mapped.title);
    }
  };

  const handleSelectItem = async (item: MediaItem) => {
    if (!onSelectItem) {
      return;
    }

    try {
      setSelectingPathname(item.pathname);
      await onSelectItem(item);
    } finally {
      setSelectingPathname(null);
    }
  };

  if (listQuery.isPending && !listQuery.data) {
    return <CmsMediaLibraryLoading />;
  }

  if (listQuery.isError) {
    const uiError = mapTrpcErrorToCmsUiMessage(listQuery.error);

    return (
      <CmsErrorState
        title={uiError.title}
        description={uiError.description}
        onRetry={() => {
          void listQuery.refetch();
        }}
      />
    );
  }

  const hasActiveSearch = deferredSearchValue.trim().length > 0;

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <CmsSurface spacing="md" className="space-y-3">
          <div className="flex items-center justify-between gap-3 max-sm:flex-col max-sm:items-stretch">
            <div className="font-ui text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
              {mediaText.totalFiles(visibleItems.length)}
            </div>
            <CmsActionButton variant="outline" onClick={() => setIsUploadOpen(true)}>
              {uploadButtonLabel ?? mediaText.uploadCta}
            </CmsActionButton>
          </div>
          <CmsSearchBar
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder={text.listToolbar.searchPlaceholder}
          />
        </CmsSurface>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {filteredItems.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item) => (
                <CmsMediaCard
                  key={item.pathname}
                  item={item}
                  selected={item.pathname === selectedPathname}
                  selectable={interactionMode === "select-inline"}
                  onPreview={() => {
                    setSelectedPathname(item.pathname);
                  }}
                />
              ))}
            </div>
          ) : (
            <CmsEmptyState
              title={
                hasActiveSearch ? mediaText.emptySearchTitle : (emptyTitle ?? mediaText.emptyTitle)
              }
              description={
                hasActiveSearch
                  ? mediaText.emptySearchDescription
                  : (emptyDescription ?? mediaText.emptyDescription)
              }
              action={
                hasActiveSearch ? undefined : (
                  <CmsActionButton variant="outline" onClick={() => setIsUploadOpen(true)}>
                    {uploadButtonLabel ?? mediaText.uploadCta}
                  </CmsActionButton>
                )
              }
            />
          )}
        </div>
      </div>

      <CmsMediaUploadDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onUploaded={handleUploaded}
        allowedKinds={allowedKinds}
      />

      {interactionMode === "preview" && selectedItem ? (
        <CmsMediaPreviewSheet
          key={selectedItem.pathname}
          item={selectedItem}
          open
          onOpenChange={(open) => {
            if (!open) {
              setSelectedPathname(null);
            }
          }}
          onRename={handleRename}
          onDelete={handleDelete}
          isRenaming={renameMutation.isPending}
          isDeleting={deleteMutation.isPending}
          selectActionLabel={selectActionLabel}
          selectDisabled={selectingPathname != null && selectingPathname !== selectedItem.pathname}
          onSelect={
            onSelectItem
              ? () => {
                  void handleSelectItem(selectedItem);
                }
              : undefined
          }
        />
      ) : null}
    </>
  );
}
