"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

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
  useMapsListQuery,
} from "@/features/cms/shared/hooks";
import { cmsCrudRoutes } from "@/lib/cms/crud-routes";
import { parseMapsListSearchParams } from "@/lib/cms/query";
import { invalidateAfterCmsMutation, mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { cmsMetaLabelClass } from "@/lib/cms/ui/variants";
import { i18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

import type { MapsListInitialData } from "@/features/cms/shared/types/initial-data";
import type { RouterInputs } from "@/lib/trpc/types";

type MapsListInput = RouterInputs["maps"]["list"];

type CmsMapsListScreenProps = {
  initialInput?: MapsListInput;
  initialData?: MapsListInitialData;
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("it-IT");
}

type MapListToolbarFiltersState = {
  isActiveValue: string;
  publishedValue: string;
  sortByValue: string;
  sortOrderValue: string;
};

const defaultMapListToolbarFilters: MapListToolbarFiltersState = {
  isActiveValue: "all",
  publishedValue: "all",
  sortByValue: "createdAt",
  sortOrderValue: "desc",
};

function buildMapListToolbarFiltersState(input: MapsListInput): MapListToolbarFiltersState {
  return {
    isActiveValue: input.query?.isActive ?? defaultMapListToolbarFilters.isActiveValue,
    publishedValue: input.query?.published ?? defaultMapListToolbarFilters.publishedValue,
    sortByValue: input.query?.sortBy ?? defaultMapListToolbarFilters.sortByValue,
    sortOrderValue: input.query?.sortOrder ?? defaultMapListToolbarFilters.sortOrderValue,
  };
}

function countActiveMapListFilters(filters: MapListToolbarFiltersState) {
  return [
    filters.isActiveValue !== defaultMapListToolbarFilters.isActiveValue,
    filters.publishedValue !== defaultMapListToolbarFilters.publishedValue,
    filters.sortByValue !== defaultMapListToolbarFilters.sortByValue,
    filters.sortOrderValue !== defaultMapListToolbarFilters.sortOrderValue,
  ].filter(Boolean).length;
}

type MapListToolbarFieldsProps = {
  filters: MapListToolbarFiltersState;
  onIsActiveChange: (value: string) => void;
  onPublishedChange: (value: string) => void;
  onSortByChange: (value: string) => void;
  onSortOrderChange: (value: string) => void;
};

function MapListToolbarFields({
  filters,
  onIsActiveChange,
  onPublishedChange,
  onSortByChange,
  onSortOrderChange,
}: MapListToolbarFieldsProps) {
  const optionsText = i18n.cms.listOptions;

  return (
    <>
      <CmsSelect
        value={filters.isActiveValue}
        onValueChange={onIsActiveChange}
        options={[
          { value: "all", label: optionsText.statusAllFeminine },
          { value: "true", label: optionsText.activeOnlyFeminine },
          { value: "false", label: optionsText.inactiveOnlyFeminine },
        ]}
      />
      <CmsSelect
        value={filters.publishedValue}
        onValueChange={onPublishedChange}
        options={[
          { value: "all", label: optionsText.publicationAll },
          { value: "true", label: optionsText.publicationOnly },
          { value: "false", label: optionsText.publicationNot },
        ]}
      />
      <CmsSelect
        value={filters.sortByValue}
        onValueChange={onSortByChange}
        options={[
          { value: "createdAt", label: optionsText.sortCreatedAt },
          { value: "publishedAt", label: optionsText.sortPublishedAt },
        ]}
      />
      <CmsSelect
        value={filters.sortOrderValue}
        onValueChange={onSortOrderChange}
        options={[
          { value: "desc", label: optionsText.desc },
          { value: "asc", label: optionsText.asc },
        ]}
      />
    </>
  );
}

export function CmsMapsListScreen({ initialInput, initialData }: CmsMapsListScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const trpcUtils = trpc.useUtils();
  const text = i18n.cms;
  const listText = text.lists.maps;
  const quickText = text.quickActions;
  const input = parseMapsListSearchParams(searchParams);
  const currentToolbarFilters = buildMapListToolbarFiltersState(input);
  const [draftToolbarFilters, setDraftToolbarFilters] = useState(currentToolbarFilters);
  const listQuery = useMapsListQuery(input, { initialDataInput: initialInput, initialData });
  const deleteMutation = trpc.maps.delete.useMutation();
  const selection = useListSelection();
  const { updateSearchParams } = useCmsListUrlState({
    baseParams: {
      page: input.page,
      pageSize: input.pageSize,
      q: input.query?.q,
      sortBy: input.query?.sortBy,
      sortOrder: input.query?.sortOrder,
      isActive: input.query?.isActive,
      published: input.query?.published,
    },
    clearSelection: selection.clearSelection,
  });

  if (listQuery.isPending) return <CmsLoadingState />;

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
  const mapIds = listQuery.items.map((map) => map.id);
  const allSelectedOnPage = mapIds.length > 0 && mapIds.every((id) => selection.isSelected(id));
  const hasActiveFilters = Boolean(
    input.query?.q || input.query?.isActive !== undefined || input.query?.published !== undefined,
  );
  const activeFiltersCount = countActiveMapListFilters(currentToolbarFilters);

  const runSingleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync({ id });
      await invalidateAfterCmsMutation(trpcUtils, "maps.delete", { id });
      selection.clearSelection();
      cmsToast.success(text.common.actionCompleted);
    } catch (error) {
      const mapped = mapQuickActionError(error);
      cmsToast.error(mapped.description, mapped.title);
    }
  };

  const runBulkDelete = async () => {
    if (!selection.hasSelection) return;

    const selectedIds = [...selection.selectedIds];
    const result = await executeBulk(selectedIds, (id) => deleteMutation.mutateAsync({ id }));
    await invalidateAfterCmsMutation(trpcUtils, "maps.delete", { ids: selectedIds });
    selection.clearSelection();

    if (result.failed === 0) {
      cmsToast.success(text.common.actionCompletedOnRecords(result.success));
      return;
    }

    const mapped = mapBulkQuickActionError(result);
    if (mapped) cmsToast.error(mapped.description, mapped.title);
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
          description: quickText.confirmDeleteMapBulk(selectedCount),
        }),
        isEnabled: ({ selectedCount, isPending }) => selectedCount > 0 && !isPending,
      } satisfies CmsQuickAction,
    ],
    { selectedCount: selection.selectedCount, isPending: isActionPending },
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CmsPageHeader
        title={text.navigation.maps}
        actions={
          <CmsActionButton variant="outline" onClick={() => router.push(cmsCrudRoutes.maps.create)}>
            <Plus aria-hidden />
            {text.resource.new}
          </CmsActionButton>
        }
      />

      <CmsDataTableShell
        toolbar={
          <div className="space-y-3">
            <div className={cmsMetaLabelClass}>
              {text.common.totalRecords(listQuery.pagination.total)}
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
                  if (open) setDraftToolbarFilters(currentToolbarFilters);
                }}
                onApply={() => {
                  updateSearchParams({
                    isActive:
                      draftToolbarFilters.isActiveValue === "all"
                        ? undefined
                        : draftToolbarFilters.isActiveValue,
                    published:
                      draftToolbarFilters.publishedValue === "all"
                        ? undefined
                        : draftToolbarFilters.publishedValue,
                    sortBy: draftToolbarFilters.sortByValue,
                    sortOrder: draftToolbarFilters.sortOrderValue,
                    page: 1,
                  });
                }}
                onClear={() => setDraftToolbarFilters(defaultMapListToolbarFilters)}
              >
                <MapListToolbarFields
                  filters={draftToolbarFilters}
                  onIsActiveChange={(value) => {
                    setDraftToolbarFilters((current) => ({ ...current, isActiveValue: value }));
                  }}
                  onPublishedChange={(value) => {
                    setDraftToolbarFilters((current) => ({ ...current, publishedValue: value }));
                  }}
                  onSortByChange={(value) => {
                    setDraftToolbarFilters((current) => ({ ...current, sortByValue: value }));
                  }}
                  onSortOrderChange={(value) => {
                    setDraftToolbarFilters((current) => ({ ...current, sortOrderValue: value }));
                  }}
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
                        onCheckedChange={() => selection.toggleSelectAll(mapIds)}
                        className={cmsTableClasses.headerCheckbox}
                        aria-label={text.common.selectAll}
                      />
                    </div>
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.title}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.status}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.published}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.items}
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
                {listQuery.items.map((map) => (
                  <TableRow key={map.id} className={cmsTableClasses.bodyRow}>
                    <TableCell
                      className={cn(cmsTableClasses.bodyCellMeta, cmsTableClasses.selectionCell)}
                    >
                      <div className={cmsTableClasses.selectionCellInner}>
                        <Checkbox
                          checked={selection.isSelected(map.id)}
                          disabled={isActionPending}
                          onCheckedChange={() => selection.toggleSelection(map.id)}
                          aria-label={listText.selectItem(map.title)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellTitle}>{map.title}</TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {map.isActive ? listText.active : listText.inactive}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {formatDate(map.publishedAt ?? "")}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellNumeric}>
                      {map.itemsCount}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {formatDate(map.createdAt)}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {formatDate(map.updatedAt)}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      <div className="flex items-center gap-2">
                        <CmsActionButton
                          variant="outline"
                          size="xs"
                          className={cmsTableClasses.rowActionButton}
                          onClick={() => router.push(cmsCrudRoutes.maps.edit(map.id))}
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
                          description={quickText.confirmDeleteMapSingle}
                          tone="danger"
                          onConfirm={() => runSingleDelete(map.id)}
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
                title={text.resource.emptyTitle(text.navigation.maps)}
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
            onPageSizeChange={(pageSize) => updateSearchParams({ pageSize, page: 1 })}
          />
        }
      />
    </div>
  );
}
