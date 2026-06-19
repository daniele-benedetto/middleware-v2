"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

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
import { CmsListFiltersSheet } from "@/features/cms/shared/components/cms-list-filters-sheet";
import { CmsListSearchInput } from "@/features/cms/shared/components/cms-list-search-input";
import {
  useCmsListUrlState,
  useListSelection,
  usePagesListQuery,
} from "@/features/cms/shared/hooks";
import { cmsCrudRoutes } from "@/lib/cms/crud-routes";
import { parsePagesListSearchParams } from "@/lib/cms/query";
import { invalidateAfterCmsMutation, mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { cmsMetaLabelClass } from "@/lib/cms/ui/variants";
import { i18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

import type { RouterInputs, RouterOutputs } from "@/lib/trpc/types";

type PagesListInput = RouterInputs["pages"]["list"];
type PagesListOutput = RouterOutputs["pages"]["list"];
type PageListItem = PagesListOutput["items"][number];

type CmsPagesListScreenProps = {
  initialInput?: PagesListInput;
  initialData?: PagesListOutput;
};

type PagesListToolbarFiltersState = {
  statusValue: string;
  sortByValue: string;
  sortOrderValue: "asc" | "desc";
};

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("it-IT");
}

function statusLabel(status: PageListItem["status"]) {
  const text = i18n.cms.lists.pages;
  if (status === "PUBLISHED") return text.statusPublished;
  if (status === "ARCHIVED") return text.statusArchived;
  return text.statusDraft;
}

function buildFiltersState(input: PagesListInput): PagesListToolbarFiltersState {
  return {
    statusValue: input.query?.status ?? "all",
    sortByValue: input.query?.sortBy ?? "updatedAt",
    sortOrderValue: input.query?.sortOrder ?? "desc",
  };
}

function countActiveFilters(filters: PagesListToolbarFiltersState) {
  return [
    filters.statusValue !== "all",
    filters.sortByValue !== "updatedAt",
    filters.sortOrderValue !== "desc",
  ].filter(Boolean).length;
}

export function CmsPagesListScreen({ initialInput, initialData }: CmsPagesListScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const trpcUtils = trpc.useUtils();
  const text = i18n.cms;
  const commonText = text.common;
  const quickText = text.quickActions;
  const input = parsePagesListSearchParams(searchParams);
  const listQuery = usePagesListQuery(input, { initialDataInput: initialInput, initialData });
  const deleteMutation = trpc.pages.delete.useMutation();
  const selection = useListSelection();
  const { clearSelection } = selection;
  const currentFilters = buildFiltersState(input);
  const [draftFilters, setDraftFilters] = useState(currentFilters);

  const { updateSearchParams } = useCmsListUrlState({
    baseParams: {
      page: input.page,
      pageSize: input.pageSize,
      q: input.query?.q,
      status: input.query?.status,
      sortBy: input.query?.sortBy,
      sortOrder: input.query?.sortOrder,
    },
  });

  useEffect(() => {
    clearSelection();
  }, [
    clearSelection,
    input.page,
    input.pageSize,
    input.query?.q,
    input.query?.sortBy,
    input.query?.sortOrder,
    input.query?.status,
  ]);

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

  const isActionPending = deleteMutation.isPending;
  const pageItemIds = listQuery.items.map((page) => page.id);
  const allSelectedOnPage =
    pageItemIds.length > 0 && pageItemIds.every((pageId) => selection.isSelected(pageId));
  const hasActiveFilters = Boolean(input.query?.q || input.query?.status);
  const activeFiltersCount = countActiveFilters(currentFilters);

  const runSingleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync({ id });
      await invalidateAfterCmsMutation(trpcUtils, "pages.delete", { id });
      selection.clearSelection();
      cmsToast.success(commonText.actionCompleted);
    } catch (error) {
      const mapped = mapQuickActionError(error);
      cmsToast.error(mapped.description, mapped.title);
    }
  };

  const runBulkDelete = async () => {
    if (!selection.hasSelection) return;

    const selectedIds = [...selection.selectedIds];
    const result = await executeBulk(selectedIds, (id) => deleteMutation.mutateAsync({ id }));

    await invalidateAfterCmsMutation(trpcUtils, "pages.delete", { ids: selectedIds });
    selection.clearSelection();

    if (result.failed === 0) {
      cmsToast.success(commonText.actionCompletedOnRecords(result.success));
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
          description: quickText.confirmDeletePageBulk(selectedCount),
        }),
        isEnabled: ({ selectedCount, isPending }) => selectedCount > 0 && !isPending,
      } satisfies CmsQuickAction,
    ],
    { selectedCount: selection.selectedCount, isPending: isActionPending },
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CmsPageHeader
        title={text.navigation.pages}
        actions={
          <CmsActionButton
            variant="outline"
            onClick={() => router.push(cmsCrudRoutes.pages.create)}
          >
            <Plus aria-hidden />
            {text.resource.new}
          </CmsActionButton>
        }
      />

      <CmsDataTableShell
        toolbar={
          <div className="space-y-3">
            <div className={cmsMetaLabelClass}>
              {commonText.totalRecords(listQuery.pagination.total)}
            </div>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
              <CmsListSearchInput
                initialValue={input.query?.q ?? ""}
                placeholder={text.listToolbar.searchPlaceholder}
                onSearchChange={(value) => updateSearchParams({ q: value, page: 1 })}
              />

              <CmsBulkActionBar
                selectedCount={selection.selectedCount}
                actions={bulkActions.map((action) => ({ ...action, onExecute: runBulkDelete }))}
                className="md:justify-self-end"
              />

              <CmsListFiltersSheet
                activeFiltersCount={activeFiltersCount}
                className="md:w-36"
                onOpenChange={(open) => {
                  if (open) setDraftFilters(currentFilters);
                }}
                onApply={() => {
                  updateSearchParams({
                    status:
                      draftFilters.statusValue === "all" ? undefined : draftFilters.statusValue,
                    sortBy: draftFilters.sortByValue,
                    sortOrder: draftFilters.sortOrderValue,
                    page: 1,
                  });
                }}
                onClear={() => {
                  setDraftFilters({
                    statusValue: "all",
                    sortByValue: "updatedAt",
                    sortOrderValue: "desc",
                  });
                }}
              >
                <CmsSelect
                  value={draftFilters.statusValue}
                  onValueChange={(value) =>
                    setDraftFilters((current) => ({ ...current, statusValue: value }))
                  }
                  options={[
                    { value: "all", label: text.listOptions.statusAllFeminine },
                    { value: "DRAFT", label: text.lists.pages.statusDraft },
                    { value: "PUBLISHED", label: text.lists.pages.statusPublished },
                    { value: "ARCHIVED", label: text.lists.pages.statusArchived },
                  ]}
                />
                <CmsSelect
                  value={draftFilters.sortByValue}
                  onValueChange={(value) =>
                    setDraftFilters((current) => ({ ...current, sortByValue: value }))
                  }
                  options={[
                    { value: "updatedAt", label: text.listOptions.sortUpdatedAt },
                    { value: "createdAt", label: text.listOptions.sortCreatedAt },
                    { value: "publishedAt", label: text.listOptions.sortPublishedAt },
                    { value: "title", label: text.listOptions.sortName },
                  ]}
                />
                <CmsSelect
                  value={draftFilters.sortOrderValue}
                  onValueChange={(value) =>
                    setDraftFilters((current) => ({
                      ...current,
                      sortOrderValue: value as "asc" | "desc",
                    }))
                  }
                  options={[
                    { value: "desc", label: text.listOptions.desc },
                    { value: "asc", label: text.listOptions.asc },
                  ]}
                />
              </CmsListFiltersSheet>
            </div>
          </div>
        }
        table={
          listQuery.items.length > 0 ? (
            <Table
              className={cmsTableClasses.table}
              containerClassName={cmsTableClasses.tableContainer}
            >
              <TableHeader>
                <TableRow className={cmsTableClasses.headerRow}>
                  <TableHead
                    className={cn(cmsTableClasses.headerCell, cmsTableClasses.selectionCell)}
                  >
                    <div className={cmsTableClasses.selectionCellInner}>
                      <Checkbox
                        checked={allSelectedOnPage}
                        disabled={isActionPending}
                        onCheckedChange={() => selection.toggleSelectAll(pageItemIds)}
                        className={cmsTableClasses.headerCheckbox}
                        aria-label={commonText.selectAll}
                      />
                    </div>
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {text.lists.pages.table.title}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {text.lists.pages.table.slug}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {text.lists.pages.table.status}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {text.lists.pages.table.published}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {text.lists.pages.table.updatedAt}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {text.lists.pages.table.actions}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQuery.items.map((page) => (
                  <TableRow key={page.id} className={cmsTableClasses.bodyRow}>
                    <TableCell
                      className={cn(cmsTableClasses.bodyCellMeta, cmsTableClasses.selectionCell)}
                    >
                      <div className={cmsTableClasses.selectionCellInner}>
                        <Checkbox
                          checked={selection.isSelected(page.id)}
                          disabled={isActionPending}
                          onCheckedChange={() => selection.toggleSelection(page.id)}
                          aria-label={text.lists.pages.selectItem(page.title)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellTitle}>{page.title}</TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>{page.slug}</TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {statusLabel(page.status)}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {formatDate(page.publishedAt)}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {formatDate(page.updatedAt)}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      <div className="flex items-center gap-2">
                        <CmsActionButton
                          variant="outline"
                          size="xs"
                          className={cmsTableClasses.rowActionButton}
                          onClick={() => router.push(cmsCrudRoutes.pages.edit(page.id))}
                          disabled={isActionPending}
                        >
                          <Pencil aria-hidden />
                          {quickText.edit}
                        </CmsActionButton>
                        <CmsConfirmDialog
                          triggerLabel={quickText.delete}
                          triggerIcon={<Trash2 aria-hidden />}
                          triggerClassName={cmsTableClasses.rowDeleteActionButton}
                          triggerDisabled={isActionPending}
                          title={quickText.confirmDeleteTitle}
                          description={quickText.confirmDeleteSinglePage}
                          tone="danger"
                          onConfirm={() => runSingleDelete(page.id)}
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
                title={text.resource.emptyTitle(text.navigation.pages)}
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
            onPageChange={(page) => updateSearchParams({ page })}
            onPageSizeChange={(pageSize) => updateSearchParams({ page: 1, pageSize })}
          />
        }
      />
    </div>
  );
}
