"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  CmsBulkActionBar,
  CmsConfirmDialog,
  CmsEmptyState,
  CmsErrorState,
  CmsLoadingState,
  CmsPaginationFooter,
} from "@/components/cms/common";
import {
  CmsActionButton,
  CmsDataTableShell,
  CmsPageHeader,
  CmsSearchBar,
  CmsSelect,
  cmsTableClasses,
  cmsToast,
} from "@/components/cms/primitives";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  executeBulk,
  mapBulkQuickActionError,
  mapQuickActionError,
  resolveQuickActions,
  type CmsQuickAction,
} from "@/features/cms/shared/actions";
import { useListSelection, useTagsListQuery } from "@/features/cms/shared/hooks";
import { cmsCrudRoutes, cmsCrudRoutesEnabled } from "@/lib/cms/crud-routes";
import { parseTagsListSearchParams, serializeCmsSearchParams } from "@/lib/cms/query";
import { invalidateAfterCmsMutation, mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc/react";

import type { TagsListInitialData } from "@/features/cms/shared/types/initial-data";
import type { RouterInputs } from "@/lib/trpc/types";

type TagsListInput = RouterInputs["tags"]["list"];

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("it-IT");
}

type TagQuickAction = "delete";

type CmsTagsListScreenProps = {
  initialInput?: TagsListInput;
  initialData?: TagsListInitialData;
};

export function CmsTagsListScreen({ initialInput, initialData }: CmsTagsListScreenProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const text = i18n.cms;
  const listText = text.lists.tags;
  const commonText = text.common;
  const quickText = text.quickActions;
  const optionsText = text.listOptions;

  const input = parseTagsListSearchParams(searchParams);
  const listQuery = useTagsListQuery(input, { initialDataInput: initialInput, initialData });
  const trpcUtils = trpc.useUtils();
  const selection = useListSelection();

  const [searchValue, setSearchValue] = useState(() => input.query?.q ?? "");
  const deleteMutation = trpc.tags.delete.useMutation();

  const navigateToCrudRoute = (href: string) => {
    if (!cmsCrudRoutesEnabled) {
      cmsToast.info("Route CRUD non ancora attive.");
      return;
    }

    router.push(href);
  };

  const updateSearchParams = useCallback(
    (patch: Record<string, string | number | undefined>) => {
      const nextParams = serializeCmsSearchParams({
        page: input.page,
        pageSize: input.pageSize,
        q: input.query?.q,
        sortBy: input.query?.sortBy,
        sortOrder: input.query?.sortOrder,
        isActive: input.query?.isActive,
        ...patch,
      });

      const next = nextParams.toString();
      selection.clearSelection();
      router.replace(next ? `${pathname}?${next}` : pathname);
    },
    [
      input.page,
      input.pageSize,
      input.query?.isActive,
      input.query?.q,
      input.query?.sortBy,
      input.query?.sortOrder,
      pathname,
      router,
      selection,
    ],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (searchValue !== (input.query?.q ?? "")) {
        updateSearchParams({ q: searchValue, page: 1 });
      }
    }, 300);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [input.query?.q, searchValue, updateSearchParams]);

  if (listQuery.isPending) {
    return <CmsLoadingState />;
  }

  if (listQuery.isError) {
    const uiError = mapTrpcErrorToCmsUiMessage(listQuery.error);

    return (
      <CmsErrorState
        title={uiError.title}
        description={uiError.description}
        onRetry={uiError.retryable ? listQuery.retry : undefined}
      />
    );
  }

  const pageTagIds = listQuery.items.map((tag) => tag.id);
  const allSelectedOnPage =
    pageTagIds.length > 0 && pageTagIds.every((tagId) => selection.isSelected(tagId));

  const runSingleAction = async (action: TagQuickAction, id: string) => {
    try {
      if (action === "delete") {
        await deleteMutation.mutateAsync({ id });
      }

      await invalidateAfterCmsMutation(trpcUtils, "tags.delete", { id });
      selection.clearSelection();
      cmsToast.info(commonText.actionCompleted);
    } catch (error) {
      const mapped = mapQuickActionError(error);
      cmsToast.error(mapped.description, mapped.title);
    }
  };

  const runBulkAction = async (action: TagQuickAction) => {
    if (!selection.hasSelection) {
      return;
    }

    const selectedIds = [...selection.selectedIds];

    const result = await executeBulk(selectedIds, (id) => {
      if (action === "delete") {
        return deleteMutation.mutateAsync({ id });
      }

      return Promise.resolve();
    });

    await invalidateAfterCmsMutation(trpcUtils, "tags.delete", { ids: selectedIds });
    selection.clearSelection();

    if (result.failed === 0) {
      cmsToast.info(commonText.actionCompletedOnRecords(result.success));
      return;
    }

    const mapped = mapBulkQuickActionError(result);

    if (mapped) {
      cmsToast.error(mapped.description, mapped.title);
    }
  };

  const bulkActions = resolveQuickActions(
    [
      {
        id: "bulk-delete",
        label: quickText.delete,
        scope: "bulk",
        tone: "danger",
        requiresConfirm: ({ selectedCount }) => selectedCount > 0,
        confirm: ({ selectedCount }) => ({
          title: quickText.confirmDeleteTitle,
          description:
            selectedCount === 1
              ? quickText.confirmDeleteTagSingle
              : quickText.confirmDeleteTagBulk(selectedCount),
        }),
        isEnabled: ({ selectedCount, isPending }) => selectedCount > 0 && !isPending,
      } satisfies CmsQuickAction,
    ],
    {
      selectedCount: selection.selectedCount,
      isPending: deleteMutation.isPending,
    },
  );

  const hasActiveFilters = Boolean(input.query?.q || input.query?.isActive !== undefined);
  const isActionPending = deleteMutation.isPending;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CmsPageHeader
        title={text.navigation.tags}
        actions={
          <CmsActionButton
            size="xs"
            variant="outline"
            onClick={() => navigateToCrudRoute(cmsCrudRoutes.tags.create)}
          >
            {text.resource.new}
          </CmsActionButton>
        }
      />

      <CmsDataTableShell
        toolbar={
          <div className="space-y-3">
            <div className="font-ui text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
              {commonText.totalRecords(listQuery.pagination.total)}
            </div>

            <CmsBulkActionBar
              selectedCount={selection.selectedCount}
              actions={bulkActions.map((action) => ({
                ...action,
                onExecute: () => {
                  void runBulkAction("delete");
                },
              }))}
              onSelectAll={
                pageTagIds.length > 0 && !allSelectedOnPage
                  ? () => selection.setSelection(pageTagIds)
                  : undefined
              }
              selectAllDisabled={isActionPending}
            />

            <div className="grid gap-3 lg:grid-cols-3">
              <CmsSearchBar
                placeholder={text.listToolbar.searchPlaceholder}
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                className="col-span-1 lg:col-span-1"
              />
              <div className="grid grid-cols-3 gap-2 col-span-1 lg:col-span-2">
                <CmsSelect
                  value={input.query?.isActive ?? "all"}
                  onValueChange={(value) => {
                    updateSearchParams({ isActive: value === "all" ? undefined : value, page: 1 });
                  }}
                  options={[
                    { value: "all", label: optionsText.statusAllMasculine },
                    { value: "true", label: optionsText.activeOnlyMasculine },
                    { value: "false", label: optionsText.inactiveOnlyMasculine },
                  ]}
                />

                <CmsSelect
                  value={input.query?.sortBy ?? "createdAt"}
                  onValueChange={(value) => {
                    updateSearchParams({ sortBy: value, page: 1 });
                  }}
                  options={[
                    { value: "createdAt", label: optionsText.sortCreatedAt },
                    { value: "name", label: optionsText.sortName },
                    { value: "slug", label: optionsText.sortSlug },
                  ]}
                />

                <CmsSelect
                  value={input.query?.sortOrder ?? "desc"}
                  onValueChange={(value) => {
                    updateSearchParams({ sortOrder: value, page: 1 });
                  }}
                  options={[
                    { value: "desc", label: optionsText.desc },
                    { value: "asc", label: optionsText.asc },
                  ]}
                />
              </div>
            </div>
          </div>
        }
        table={
          listQuery.items.length > 0 ? (
            <Table className={cmsTableClasses.table}>
              <TableHeader>
                <TableRow className={cmsTableClasses.headerRow}>
                  <TableHead className={cmsTableClasses.headerCell}>
                    <Checkbox
                      checked={allSelectedOnPage}
                      onCheckedChange={() => {
                        selection.toggleSelectAll(pageTagIds);
                      }}
                      className={cmsTableClasses.headerCheckbox}
                      aria-label={commonText.selectAll}
                    />
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.name}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.slug}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.status}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.articles}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.createdAt}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.updatedAt}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.actions}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQuery.items.map((tag) => (
                  <TableRow key={tag.id} className={cmsTableClasses.bodyRow}>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      <Checkbox
                        checked={selection.isSelected(tag.id)}
                        onCheckedChange={() => {
                          selection.toggleSelection(tag.id);
                        }}
                        aria-label={listText.selectItem(tag.name)}
                      />
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellTitle}>{tag.name}</TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>{tag.slug}</TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {tag.isActive ? listText.active : listText.inactive}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {String(tag.articlesCount)}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {formatDate(tag.createdAt)}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {formatDate(tag.updatedAt)}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      <div className="flex items-center gap-2">
                        <CmsActionButton
                          variant="outline"
                          size="xs"
                          onClick={() => navigateToCrudRoute(cmsCrudRoutes.tags.edit(tag.id))}
                          disabled={deleteMutation.isPending}
                        >
                          {quickText.edit}
                        </CmsActionButton>
                        <CmsConfirmDialog
                          triggerLabel={quickText.delete}
                          triggerDisabled={deleteMutation.isPending}
                          title={quickText.confirmDeleteTitle}
                          description={quickText.confirmDeleteSingleTag}
                          tone="danger"
                          onConfirm={() => {
                            void runSingleAction("delete", tag.id);
                          }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="px-5 py-4">
              <CmsEmptyState
                eyebrow={listText.eyebrow}
                title={text.resource.emptyTitle(text.navigation.tags)}
                description={text.resource.emptyDescription}
                descriptionFiltered={text.resource.emptyDescriptionFiltered}
                hasActiveFilters={hasActiveFilters}
              />
            </div>
          )
        }
        pagination={
          <CmsPaginationFooter
            currentPage={listQuery.pagination.page}
            totalPages={Math.max(
              1,
              Math.ceil(listQuery.pagination.total / listQuery.pagination.pageSize),
            )}
            pageSize={listQuery.pagination.pageSize}
            onPageChange={(page) => {
              updateSearchParams({ page });
            }}
            onPageSizeChange={(pageSize) => {
              updateSearchParams({ pageSize, page: 1 });
            }}
          />
        }
      />
    </div>
  );
}
