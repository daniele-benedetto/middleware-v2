"use client";

import { Upload } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { CmsEmptyState, CmsErrorState, CmsPaginationFooter } from "@/components/cms/common";
import {
  CmsActionButton,
  CmsDataTableShell,
  CmsSearchBar,
  cmsToast,
} from "@/components/cms/primitives";
import { CmsMediaCard } from "@/features/cms/media/components/media-card";
import { CmsMediaLibraryLoading } from "@/features/cms/media/components/media-library-loading";
import { CmsMediaPreviewSheet } from "@/features/cms/media/components/media-preview-sheet";
import {
  CmsMediaUploadDialog,
  type CmsMediaUploadResult,
} from "@/features/cms/media/components/media-upload-dialog";
import { invalidateArticlesAfterMutation, mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { cmsMetaLabelClass } from "@/lib/cms/ui/variants";
import { i18n } from "@/lib/i18n";
import { cmsMediaDefaultKinds } from "@/lib/media/blob";
import { trpc } from "@/lib/trpc/react";

import type { CmsSupportedMediaKind } from "@/lib/media/blob";
import type { RouterOutputs } from "@/lib/trpc/types";

type MediaListInitialData = RouterOutputs["media"]["list"];
type MediaItem = MediaListInitialData["items"][number];

const emptyMediaItems: MediaItem[] = [];
const defaultMediaPageSize = 20;

type CmsMediaLibraryProps = {
  initialData?: MediaListInitialData;
  allowedKinds?: CmsSupportedMediaKind[];
  uploadButtonLabel?: string;
  selectActionLabel?: string;
  interactionMode?: "preview" | "select-inline";
  onSelectItem?: (item: MediaItem) => Promise<void> | void;
  onSelectionChange?: (item: MediaItem | null) => void;
  onMediaUploaded?: (media: CmsMediaUploadResult) => Promise<void> | void;
  uploadOpen?: boolean;
  onUploadOpenChange?: (open: boolean) => void;
  showUploadActionInToolbar?: boolean;
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
  onMediaUploaded,
  uploadOpen,
  onUploadOpenChange,
  showUploadActionInToolbar = true,
  emptyTitle,
  emptyDescription,
}: CmsMediaLibraryProps) {
  const text = i18n.cms;
  const mediaText = text.lists.media;
  const trpcUtils = trpc.useUtils();
  const listQuery = trpc.media.list.useQuery(undefined, initialData ? { initialData } : undefined);
  const renameMutation = trpc.media.rename.useMutation();
  const deleteMutation = trpc.media.delete.useMutation();
  const [localUploadOpen, setLocalUploadOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultMediaPageSize);
  const [selectedPathname, setSelectedPathname] = useState<string | null>(null);
  const [selectingPathname, setSelectingPathname] = useState<string | null>(null);
  const deferredSearchValue = useDeferredValue(searchValue);
  const isUploadOpen = uploadOpen ?? localUploadOpen;
  const setIsUploadOpen = onUploadOpenChange ?? setLocalUploadOpen;

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

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const effectivePage = Math.min(currentPage, totalPages);
  const paginatedItems = useMemo(() => {
    const start = (effectivePage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [effectivePage, filteredItems, pageSize]);

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

  const handleUploaded = async (media: CmsMediaUploadResult) => {
    await refreshMedia();
    setSelectedPathname(media.pathname);

    if (onMediaUploaded) {
      await onMediaUploaded(media);
      return;
    }

    cmsToast.success(mediaText.uploadCompleted);
  };

  const handleRename = async (item: MediaItem, nextName: string) => {
    try {
      const result = await renameMutation.mutateAsync({
        url: item.url,
        name: nextName,
      });

      await refreshMedia(result.articleIds);
      setSelectedPathname(result.item.pathname);
      cmsToast.success(
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
      cmsToast.success(
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
      <div className="flex min-h-0 flex-1 flex-col">
        <CmsDataTableShell
          toolbar={
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 max-sm:flex-col max-sm:items-stretch">
                <div className={cmsMetaLabelClass}>
                  {mediaText.totalFiles(filteredItems.length)}
                </div>
                {showUploadActionInToolbar ? (
                  <CmsActionButton variant="outline" onClick={() => setIsUploadOpen(true)}>
                    <Upload aria-hidden />
                    {uploadButtonLabel ?? mediaText.uploadCta}
                  </CmsActionButton>
                ) : null}
              </div>
              <CmsSearchBar
                value={searchValue}
                onChange={(event) => {
                  setSearchValue(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder={text.listToolbar.searchPlaceholder}
              />
            </div>
          }
          table={
            paginatedItems.length > 0 ? (
              <div className="p-5">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  {paginatedItems.map((item) => (
                    <CmsMediaCard
                      key={item.pathname}
                      item={item}
                      selected={
                        interactionMode === "select-inline" && item.pathname === selectedPathname
                      }
                      selectable={interactionMode === "select-inline"}
                      onPreview={() => {
                        setSelectedPathname(item.pathname);
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="px-5 py-4">
                <CmsEmptyState
                  title={
                    hasActiveSearch
                      ? mediaText.emptySearchTitle
                      : (emptyTitle ?? mediaText.emptyTitle)
                  }
                  description={
                    hasActiveSearch
                      ? mediaText.emptySearchDescription
                      : (emptyDescription ?? mediaText.emptyDescription)
                  }
                  action={
                    hasActiveSearch ? undefined : (
                      <CmsActionButton variant="outline" onClick={() => setIsUploadOpen(true)}>
                        <Upload aria-hidden />
                        {uploadButtonLabel ?? mediaText.uploadShortCta}
                      </CmsActionButton>
                    )
                  }
                />
              </div>
            )
          }
          pagination={
            <CmsPaginationFooter
              currentPage={effectivePage}
              totalPages={totalPages}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(nextPageSize) => {
                setPageSize(nextPageSize);
                setCurrentPage(1);
              }}
            />
          }
        />
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
