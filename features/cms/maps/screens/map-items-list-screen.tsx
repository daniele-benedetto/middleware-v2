"use client";

import { Pencil, Trash2 } from "lucide-react";
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
  useMapItemsListQuery,
  useMapsListQuery,
} from "@/features/cms/shared/hooks";
import { cmsCrudRoutes } from "@/lib/cms/crud-routes";
import { parseMapItemsListSearchParams } from "@/lib/cms/query";
import { invalidateAfterCmsMutation, mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { cmsMetaLabelClass } from "@/lib/cms/ui/variants";
import { i18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

import type {
  MapItemsListInitialData,
  MapsListInitialData,
} from "@/features/cms/shared/types/initial-data";
import type { RouterInputs } from "@/lib/trpc/types";

type MapItemsListInput = RouterInputs["maps"]["listItems"];

type CmsMapItemsListScreenProps = {
  initialInput?: MapItemsListInput;
  initialData?: MapItemsListInitialData;
};

type MapItemsListToolbarFiltersState = {
  mapIdValue: string;
  sortByValue: string;
  sortOrderValue: string;
};

const defaultMapItemsListToolbarFilters: MapItemsListToolbarFiltersState = {
  mapIdValue: "all",
  sortByValue: "updatedAt",
  sortOrderValue: "desc",
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("it-IT");
}

function buildMapItemsListToolbarFiltersState(
  input: MapItemsListInput,
): MapItemsListToolbarFiltersState {
  return {
    mapIdValue: input.query?.mapId ?? defaultMapItemsListToolbarFilters.mapIdValue,
    sortByValue: input.query?.sortBy ?? defaultMapItemsListToolbarFilters.sortByValue,
    sortOrderValue: input.query?.sortOrder ?? defaultMapItemsListToolbarFilters.sortOrderValue,
  };
}

function countActiveMapItemsListFilters(filters: MapItemsListToolbarFiltersState) {
  return [
    filters.mapIdValue !== defaultMapItemsListToolbarFilters.mapIdValue,
    filters.sortByValue !== defaultMapItemsListToolbarFilters.sortByValue,
    filters.sortOrderValue !== defaultMapItemsListToolbarFilters.sortOrderValue,
  ].filter(Boolean).length;
}

type MapItemsListToolbarFieldsProps = {
  filters: MapItemsListToolbarFiltersState;
  maps: MapsListInitialData["items"];
  onMapChange: (value: string) => void;
  onSortByChange: (value: string) => void;
  onSortOrderChange: (value: string) => void;
};

function MapItemsListToolbarFields({
  filters,
  maps,
  onMapChange,
  onSortByChange,
  onSortOrderChange,
}: MapItemsListToolbarFieldsProps) {
  const optionsText = i18n.cms.listOptions;

  return (
    <>
      <CmsSelect
        value={filters.mapIdValue}
        onValueChange={onMapChange}
        options={[
          { value: "all", label: "Mappa: tutte" },
          ...maps.map((map) => ({ value: map.id, label: map.title })),
        ]}
      />
      <CmsSelect
        value={filters.sortByValue}
        onValueChange={onSortByChange}
        options={[
          { value: "updatedAt", label: optionsText.sortUpdatedAt },
          { value: "createdAt", label: optionsText.sortCreatedAt },
          { value: "title", label: "Ordina per: punto" },
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

export function CmsMapItemsListScreen({ initialInput, initialData }: CmsMapItemsListScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const text = i18n.cms;
  const listText = text.lists.mapItems;
  const quickText = text.quickActions;
  const input = parseMapItemsListSearchParams(searchParams);
  const currentToolbarFilters = buildMapItemsListToolbarFiltersState(input);
  const [draftToolbarFilters, setDraftToolbarFilters] = useState(currentToolbarFilters);
  const listQuery = useMapItemsListQuery(input, { initialDataInput: initialInput, initialData });
  const mapsQuery = useMapsListQuery({
    page: 1,
    pageSize: 100,
    query: { sortBy: "createdAt", sortOrder: "asc" },
  });
  const trpcUtils = trpc.useUtils();
  const deleteMutation = trpc.maps.deleteItem.useMutation();
  const selection = useListSelection();
  const { updateSearchParams } = useCmsListUrlState({
    baseParams: {
      page: input.page,
      pageSize: input.pageSize,
      q: input.query?.q,
      mapId: input.query?.mapId,
      sortBy: input.query?.sortBy,
      sortOrder: input.query?.sortOrder,
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
  const itemIds = listQuery.items.map((item) => item.id);
  const allSelectedOnPage = itemIds.length > 0 && itemIds.every((id) => selection.isSelected(id));
  const hasActiveFilters = Boolean(input.query?.q || input.query?.mapId);
  const activeFiltersCount = countActiveMapItemsListFilters(currentToolbarFilters);
  const availableMaps = mapsQuery.items;

  const runSingleDelete = async (mapId: string, itemId: string) => {
    try {
      await deleteMutation.mutateAsync({ mapId, itemId });
      await invalidateAfterCmsMutation(trpcUtils, "maps.deleteItem", { id: mapId });
      selection.clearSelection();
      cmsToast.success(text.common.actionCompleted);
    } catch (error) {
      const mapped = mapQuickActionError(error);
      cmsToast.error(mapped.description, mapped.title);
    }
  };

  const runBulkDelete = async () => {
    if (!selection.hasSelection) return;

    const selectedItems = new Map(
      listQuery.items
        .filter((item) => selection.isSelected(item.id))
        .map((item) => [item.id, item]),
    );
    const result = await executeBulk([...selectedItems.keys()], (itemId) => {
      const item = selectedItems.get(itemId);
      if (!item) return Promise.resolve();
      return deleteMutation.mutateAsync({ mapId: item.mapId, itemId: item.id });
    });
    await invalidateAfterCmsMutation(trpcUtils, "maps.deleteItem");
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
          description:
            selectedCount === 1
              ? quickText.confirmDeleteMapItemSingle
              : quickText.confirmDeleteMapItemBulk(selectedCount),
        }),
        isEnabled: ({ selectedCount, isPending }) => selectedCount > 0 && !isPending,
      } satisfies CmsQuickAction,
    ],
    { selectedCount: selection.selectedCount, isPending: isActionPending },
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CmsPageHeader title={text.navigation.mapItems} />
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
                    mapId:
                      draftToolbarFilters.mapIdValue === "all"
                        ? undefined
                        : draftToolbarFilters.mapIdValue,
                    sortBy: draftToolbarFilters.sortByValue,
                    sortOrder: draftToolbarFilters.sortOrderValue,
                    page: 1,
                  });
                }}
                onClear={() => setDraftToolbarFilters(defaultMapItemsListToolbarFilters)}
              >
                <MapItemsListToolbarFields
                  filters={draftToolbarFilters}
                  maps={availableMaps}
                  onMapChange={(value) => {
                    setDraftToolbarFilters((current) => ({ ...current, mapIdValue: value }));
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
                        onCheckedChange={() => selection.toggleSelectAll(itemIds)}
                        className={cmsTableClasses.headerCheckbox}
                        aria-label={text.common.selectAll}
                      />
                    </div>
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.title}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>{listText.table.map}</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.coordinates}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.order}
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
                          disabled={isActionPending}
                          onCheckedChange={() => selection.toggleSelection(item.id)}
                          aria-label={listText.selectItem(item.title)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellTitle}>{item.title}</TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>{item.mapTitle}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {item.latitude}, {item.longitude}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellNumeric}>
                      {item.sortOrder + 1}
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
                          className={cmsTableClasses.rowActionButton}
                          onClick={() =>
                            router.push(cmsCrudRoutes.maps.items.edit(item.mapId, item.id))
                          }
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
                          description={quickText.confirmDeleteMapItemSingle}
                          tone="danger"
                          onConfirm={() => runSingleDelete(item.mapId, item.id)}
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
                title={text.resource.emptyTitle(text.navigation.mapItems)}
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
