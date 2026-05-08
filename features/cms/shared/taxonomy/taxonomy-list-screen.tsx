"use client";

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
import { useListSelection } from "@/features/cms/shared/hooks";
import {
  invalidateAfterCmsMutation,
  mapTrpcErrorToCmsUiMessage,
  type CmsMutationName,
} from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

type CmsTaxonomyListItem = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  articlesCount: number;
  createdAt: string;
  updatedAt: string;
};

type CmsTaxonomyListText = {
  table: {
    name: string;
    slug: string;
    status: string;
    articles: string;
    createdAt: string;
    updatedAt: string;
    actions: string;
  };
  active: string;
  inactive: string;
  selectItem: (name: string) => string;
};

type CmsTaxonomyListQueryState<TItem> = {
  items: TItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  isPending: boolean;
  isError: boolean;
  error: unknown;
  retry: () => void;
};

type CmsTaxonomyDeleteMutation = {
  isPending: boolean;
  mutateAsync: (input: { id: string }) => Promise<unknown>;
};

type CmsTaxonomyListInput = {
  page?: number;
  pageSize?: number;
  query?: {
    q?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    isActive?: "true" | "false";
  };
};

type CmsTaxonomyListScreenProps<TItem extends CmsTaxonomyListItem> = {
  title: string;
  input: CmsTaxonomyListInput;
  listQuery: CmsTaxonomyListQueryState<TItem>;
  listText: CmsTaxonomyListText;
  emptyTitle: string;
  updateSearchParams: (patch: {
    q?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    isActive?: "true" | "false" | undefined;
  }) => void;
  onCreate: () => void;
  onEdit: (id: string) => void;
  deleteMutation: CmsTaxonomyDeleteMutation;
  deleteMutationName: Extract<CmsMutationName, "categories.delete" | "tags.delete">;
  bulkDeleteDescription: (selectedCount: number) => string;
  statusOptions: Array<{ value: "all" | "true" | "false"; label: string }>;
  sortOptions: Array<{ value: string; label: string }>;
};

type TaxonomyListToolbarFiltersState = {
  isActiveValue: string;
  sortByValue: string;
  sortOrderValue: "asc" | "desc";
};

function buildTaxonomyListToolbarFiltersState(
  input: CmsTaxonomyListInput,
  defaultSortByValue: string,
): TaxonomyListToolbarFiltersState {
  return {
    isActiveValue: input.query?.isActive ?? "all",
    sortByValue: input.query?.sortBy ?? defaultSortByValue,
    sortOrderValue: input.query?.sortOrder ?? "desc",
  };
}

function countActiveTaxonomyListFilters(
  filters: TaxonomyListToolbarFiltersState,
  defaultSortByValue: string,
) {
  return [
    filters.isActiveValue !== "all",
    filters.sortByValue !== defaultSortByValue,
    filters.sortOrderValue !== "desc",
  ].filter(Boolean).length;
}

type TaxonomyListToolbarFieldsProps = {
  filters: TaxonomyListToolbarFiltersState;
  statusOptions: Array<{ value: "all" | "true" | "false"; label: string }>;
  sortOptions: Array<{ value: string; label: string }>;
  onIsActiveChange: (value: string) => void;
  onSortByChange: (value: string) => void;
  onSortOrderChange: (value: "asc" | "desc") => void;
  layout: "desktop" | "mobile";
};

function TaxonomyListToolbarFields({
  filters,
  statusOptions,
  sortOptions,
  onIsActiveChange,
  onSortByChange,
  onSortOrderChange,
  layout,
}: TaxonomyListToolbarFieldsProps) {
  const optionsText = i18n.cms.listOptions;

  const statusField = (
    <CmsSelect
      value={filters.isActiveValue}
      onValueChange={onIsActiveChange}
      options={statusOptions}
    />
  );

  const sortByField = (
    <CmsSelect value={filters.sortByValue} onValueChange={onSortByChange} options={sortOptions} />
  );

  const sortOrderField = (
    <CmsSelect
      value={filters.sortOrderValue}
      onValueChange={(value) => {
        onSortOrderChange(value as "asc" | "desc");
      }}
      options={[
        { value: "desc", label: optionsText.desc },
        { value: "asc", label: optionsText.asc },
      ]}
    />
  );

  if (layout === "mobile") {
    return (
      <>
        {statusField}
        {sortByField}
        {sortOrderField}
      </>
    );
  }

  return (
    <div className="col-span-1 grid grid-cols-3 gap-2 lg:col-span-2">
      {statusField}
      {sortByField}
      {sortOrderField}
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("it-IT");
}

export function CmsTaxonomyListScreen<TItem extends CmsTaxonomyListItem>({
  title,
  input,
  listQuery,
  listText,
  emptyTitle,
  updateSearchParams,
  onCreate,
  onEdit,
  deleteMutation,
  deleteMutationName,
  bulkDeleteDescription,
  statusOptions,
  sortOptions,
}: CmsTaxonomyListScreenProps<TItem>) {
  const text = i18n.cms;
  const commonText = text.common;
  const quickText = text.quickActions;
  const trpcUtils = trpc.useUtils();
  const selection = useListSelection();
  const { clearSelection } = selection;
  const defaultSortByValue = sortOptions[0]?.value ?? "createdAt";
  const currentToolbarFilters = buildTaxonomyListToolbarFiltersState(input, defaultSortByValue);
  const [draftToolbarFilters, setDraftToolbarFilters] = useState(currentToolbarFilters);

  useEffect(() => {
    clearSelection();
  }, [
    clearSelection,
    input.page,
    input.pageSize,
    input.query?.isActive,
    input.query?.q,
    input.query?.sortBy,
    input.query?.sortOrder,
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
  const pageItemIds = listQuery.items.map((item) => item.id);
  const allSelectedOnPage =
    pageItemIds.length > 0 && pageItemIds.every((itemId) => selection.isSelected(itemId));

  const runSingleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync({ id });
      await invalidateAfterCmsMutation(trpcUtils, deleteMutationName, { id });
      selection.clearSelection();
      cmsToast.info(commonText.actionCompleted);
    } catch (error) {
      const mapped = mapQuickActionError(error);
      cmsToast.error(mapped.description, mapped.title);
    }
  };

  const runBulkDelete = async () => {
    if (!selection.hasSelection) {
      return;
    }

    const selectedIds = [...selection.selectedIds];
    const result = await executeBulk(selectedIds, (id) => deleteMutation.mutateAsync({ id }));

    await invalidateAfterCmsMutation(trpcUtils, deleteMutationName, { ids: selectedIds });
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
          description: bulkDeleteDescription(selectedCount),
        }),
        isEnabled: ({ selectedCount, isPending }) => selectedCount > 0 && !isPending,
      } satisfies CmsQuickAction,
    ],
    {
      selectedCount: selection.selectedCount,
      isPending: isActionPending,
    },
  );

  const hasActiveFilters = Boolean(input.query?.q || input.query?.isActive !== undefined);
  const activeFiltersCount = countActiveTaxonomyListFilters(
    currentToolbarFilters,
    defaultSortByValue,
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CmsPageHeader
        title={title}
        actions={
          <CmsActionButton variant="outline" onClick={onCreate}>
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
                onExecute: runBulkDelete,
              }))}
              onSelectAll={
                pageItemIds.length > 0 && !allSelectedOnPage
                  ? () => selection.setSelection(pageItemIds)
                  : undefined
              }
              selectAllDisabled={isActionPending}
            />

            <div className="space-y-3 md:hidden">
              <CmsListSearchInput
                key={input.query?.q ?? ""}
                initialValue={input.query?.q ?? ""}
                placeholder={text.listToolbar.searchPlaceholder}
                onSearchChange={(value) => {
                  updateSearchParams({ q: value, page: 1 });
                }}
              />

              <CmsListFiltersSheet
                activeFiltersCount={activeFiltersCount}
                onOpenChange={(open) => {
                  if (open) {
                    setDraftToolbarFilters(currentToolbarFilters);
                  }
                }}
                onApply={() => {
                  updateSearchParams({
                    isActive:
                      draftToolbarFilters.isActiveValue === "all"
                        ? undefined
                        : (draftToolbarFilters.isActiveValue as "true" | "false"),
                    sortBy: draftToolbarFilters.sortByValue,
                    sortOrder: draftToolbarFilters.sortOrderValue,
                    page: 1,
                  });
                }}
                onClear={() => {
                  setDraftToolbarFilters({
                    isActiveValue: "all",
                    sortByValue: defaultSortByValue,
                    sortOrderValue: "desc",
                  });
                }}
              >
                <TaxonomyListToolbarFields
                  filters={draftToolbarFilters}
                  statusOptions={statusOptions}
                  sortOptions={sortOptions}
                  onIsActiveChange={(value) => {
                    setDraftToolbarFilters((current) => ({ ...current, isActiveValue: value }));
                  }}
                  onSortByChange={(value) => {
                    setDraftToolbarFilters((current) => ({ ...current, sortByValue: value }));
                  }}
                  onSortOrderChange={(value) => {
                    setDraftToolbarFilters((current) => ({ ...current, sortOrderValue: value }));
                  }}
                  layout="mobile"
                />
              </CmsListFiltersSheet>
            </div>

            <div className="hidden gap-3 md:grid lg:grid-cols-3">
              <CmsListSearchInput
                key={input.query?.q ?? ""}
                initialValue={input.query?.q ?? ""}
                placeholder={text.listToolbar.searchPlaceholder}
                className="col-span-1 lg:col-span-1"
                onSearchChange={(value) => {
                  updateSearchParams({ q: value, page: 1 });
                }}
              />

              <TaxonomyListToolbarFields
                filters={currentToolbarFilters}
                statusOptions={statusOptions}
                sortOptions={sortOptions}
                onIsActiveChange={(value) => {
                  updateSearchParams({
                    isActive: value === "all" ? undefined : (value as "true" | "false"),
                    page: 1,
                  });
                }}
                onSortByChange={(value) => {
                  updateSearchParams({ sortBy: value, page: 1 });
                }}
                onSortOrderChange={(value) => {
                  updateSearchParams({ sortOrder: value, page: 1 });
                }}
                layout="desktop"
              />
            </div>
          </div>
        }
        table={
          listQuery.items.length > 0 ? (
            <Table className={cmsTableClasses.table}>
              <TableHeader>
                <TableRow className={cmsTableClasses.headerRow}>
                  <TableHead
                    className={cn(cmsTableClasses.headerCell, cmsTableClasses.selectionCell)}
                  >
                    <div className={cmsTableClasses.selectionCellInner}>
                      <Checkbox
                        checked={allSelectedOnPage}
                        onCheckedChange={() => {
                          selection.toggleSelectAll(pageItemIds);
                        }}
                        className={cmsTableClasses.headerCheckbox}
                        aria-label={commonText.selectAll}
                      />
                    </div>
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
                {listQuery.items.map((item) => (
                  <TableRow key={item.id} className={cmsTableClasses.bodyRow}>
                    <TableCell
                      className={cn(cmsTableClasses.bodyCellMeta, cmsTableClasses.selectionCell)}
                    >
                      <div className={cmsTableClasses.selectionCellInner}>
                        <Checkbox
                          checked={selection.isSelected(item.id)}
                          onCheckedChange={() => {
                            selection.toggleSelection(item.id);
                          }}
                          aria-label={listText.selectItem(item.name)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellTitle}>{item.name}</TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>{item.slug}</TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {item.isActive ? listText.active : listText.inactive}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {String(item.articlesCount)}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {formatDate(item.createdAt)}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {formatDate(item.updatedAt)}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      <div className="flex items-center gap-2">
                        <CmsActionButton
                          variant="outline"
                          size="xs"
                          onClick={() => onEdit(item.id)}
                          disabled={deleteMutation.isPending}
                        >
                          {quickText.edit}
                        </CmsActionButton>
                        <CmsConfirmDialog
                          triggerLabel={quickText.delete}
                          triggerDisabled={deleteMutation.isPending}
                          title={quickText.confirmDeleteTitle}
                          description={bulkDeleteDescription(1)}
                          tone="danger"
                          onConfirm={() => runSingleDelete(item.id)}
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
                title={emptyTitle}
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
