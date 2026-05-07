"use client";

import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter, useSearchParams } from "next/navigation";

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
import { CmsListSearchInput } from "@/features/cms/shared/components/cms-list-search-input";
import {
  cmsListQueryOptions,
  useCmsListUrlState,
  useDragReorder,
  useIssuesListQuery,
  useListSelection,
  useSortableSensors,
} from "@/features/cms/shared/hooks";
import { cmsCrudRoutes } from "@/lib/cms/crud-routes";
import { parseIssuesListSearchParams } from "@/lib/cms/query";
import { invalidateAfterCmsMutation, mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import { paginationDefaults } from "@/lib/server/http/pagination";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

import type { IssuesListInitialData } from "@/features/cms/shared/types/initial-data";
import type { RouterInputs } from "@/lib/trpc/types";

type IssuesListInput = RouterInputs["issues"]["list"];

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("it-IT");
}

type IssueQuickAction = "delete";

type CmsIssuesListScreenProps = {
  initialInput?: IssuesListInput;
  initialData?: IssuesListInitialData;
};

type IssueTableRow = {
  id: string;
  title: string;
  slug: string;
  isActive: boolean;
  publishedAt: string | null;
  articlesCount: number;
  createdAt: string;
  updatedAt: string;
};

function stopRowReorder(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

type SortableIssueRowProps = {
  issue: IssueTableRow;
  canReorder: boolean;
  isPending: boolean;
  isSelected: boolean;
  onToggleSelection: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  selectLabel: string;
  editLabel: string;
  deleteLabel: string;
  deleteConfirmTitle: string;
  deleteConfirmDescription: string;
  activeLabel: string;
  inactiveLabel: string;
};

function SortableIssueRow({
  issue,
  canReorder,
  isPending,
  isSelected,
  onToggleSelection,
  onEdit,
  onDelete,
  selectLabel,
  editLabel,
  deleteLabel,
  deleteConfirmTitle,
  deleteConfirmDescription,
  activeLabel,
  inactiveLabel,
}: SortableIssueRowProps) {
  const isDragEnabled = canReorder && !isPending;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: issue.id,
    disabled: !isDragEnabled,
  });

  const rowTransform = transform ? { ...transform, x: 0, scaleX: 1, scaleY: 1 } : null;

  return (
    <TableRow
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(rowTransform), transition }}
      className={cn(
        cmsTableClasses.bodyRow,
        isDragEnabled && "cursor-grab select-none touch-manipulation active:cursor-grabbing",
        isDragging && "relative z-10 bg-white shadow-[0_0_0_2px_var(--color-accent)]",
      )}
      {...(isDragEnabled ? attributes : {})}
      {...(isDragEnabled ? listeners : {})}
    >
      <TableCell className={cn(cmsTableClasses.bodyCellMeta, cmsTableClasses.selectionCell)}>
        <div className={cmsTableClasses.selectionCellInner} onPointerDownCapture={stopRowReorder}>
          <Checkbox
            checked={isSelected}
            disabled={isPending}
            onCheckedChange={() => {
              onToggleSelection(issue.id);
            }}
            aria-label={selectLabel}
          />
        </div>
      </TableCell>
      <TableCell className={cmsTableClasses.bodyCellTitle}>{issue.title}</TableCell>
      <TableCell className={cmsTableClasses.bodyCellMeta}>{issue.slug}</TableCell>
      <TableCell className={cmsTableClasses.bodyCellMeta}>
        {issue.isActive ? activeLabel : inactiveLabel}
      </TableCell>
      <TableCell className={cmsTableClasses.bodyCellMeta}>
        {formatDate(issue.publishedAt)}
      </TableCell>
      <TableCell className={cmsTableClasses.bodyCellMeta}>{String(issue.articlesCount)}</TableCell>
      <TableCell className={cmsTableClasses.bodyCellMeta}>{formatDate(issue.createdAt)}</TableCell>
      <TableCell className={cmsTableClasses.bodyCellMeta}>{formatDate(issue.updatedAt)}</TableCell>
      <TableCell className={cmsTableClasses.bodyCellMeta}>
        <div className="flex items-center gap-2" onPointerDownCapture={stopRowReorder}>
          <CmsActionButton
            variant="outline"
            size="xs"
            onClick={() => onEdit(issue.id)}
            disabled={isPending}
          >
            {editLabel}
          </CmsActionButton>
          <CmsConfirmDialog
            triggerLabel={deleteLabel}
            triggerDisabled={isPending}
            title={deleteConfirmTitle}
            description={deleteConfirmDescription}
            tone="danger"
            onConfirm={() => onDelete(issue.id)}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}

export function CmsIssuesListScreen({ initialInput, initialData }: CmsIssuesListScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const text = i18n.cms;
  const listText = text.lists.issues;
  const commonText = text.common;
  const quickText = text.quickActions;
  const optionsText = text.listOptions;

  const input = parseIssuesListSearchParams(searchParams);
  const listQuery = useIssuesListQuery(input, { initialDataInput: initialInput, initialData });
  const trpcUtils = trpc.useUtils();
  const selection = useListSelection();

  const reorderBaseInput: IssuesListInput = {
    page: 1,
    pageSize: paginationDefaults.maxPageSize,
    query: {
      sortBy: "sortOrder",
      sortOrder: "asc",
    },
  };

  const reorderBaseQuery = trpc.issues.list.useQuery(reorderBaseInput, {
    ...cmsListQueryOptions,
    enabled:
      input.query?.sortBy === "sortOrder" &&
      input.query.sortOrder === "asc" &&
      !input.query.q &&
      input.query.isActive === undefined &&
      input.query.published === undefined,
  });

  const reorderBaseData = reorderBaseQuery.data;
  const hasFullReorderBase = reorderBaseData
    ? reorderBaseData.pagination.total === reorderBaseData.items.length
    : false;

  const reorder = useDragReorder(reorderBaseData?.items ?? []);
  const sortableSensors = useSortableSensors();

  const navigateToCrudRoute = (href: string) => {
    router.push(href);
  };

  const deleteMutation = trpc.issues.delete.useMutation();
  const reorderMutation = trpc.issues.reorder.useMutation();

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

  const canReorder =
    input.query?.sortBy === "sortOrder" &&
    input.query.sortOrder === "asc" &&
    !input.query.q &&
    input.query.isActive === undefined &&
    input.query.published === undefined &&
    Boolean(reorderBaseData) &&
    hasFullReorderBase;

  const displayedIssues = canReorder ? reorder.displayedItems : listQuery.items;

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

  const isActionPending = deleteMutation.isPending || reorderMutation.isPending;

  const pageIssueIds = displayedIssues.map((issue) => issue.id);
  const allSelectedOnPage =
    pageIssueIds.length > 0 && pageIssueIds.every((issueId) => selection.isSelected(issueId));

  const runSingleAction = async (action: IssueQuickAction, id: string) => {
    try {
      if (action === "delete") {
        await deleteMutation.mutateAsync({ id });
      }

      await invalidateAfterCmsMutation(trpcUtils, "issues.delete", { id });
      selection.clearSelection();
      cmsToast.info(commonText.actionCompleted);
    } catch (error) {
      const mapped = mapQuickActionError(error);
      cmsToast.error(mapped.description, mapped.title);
    }
  };

  const runBulkAction = async (action: IssueQuickAction) => {
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

    await invalidateAfterCmsMutation(trpcUtils, "issues.delete", { ids: selectedIds });
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

  const persistIssueOrder = async (nextOrder: string[]) => {
    try {
      const reorderedItems = await reorderMutation.mutateAsync({
        orderedIssueIds: nextOrder,
      });

      const visibleStart = (listQuery.pagination.page - 1) * listQuery.pagination.pageSize;
      const visibleEnd = visibleStart + listQuery.pagination.pageSize;

      trpcUtils.issues.list.setData(input, (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          items: reorderedItems.slice(visibleStart, visibleEnd),
        };
      });

      trpcUtils.issues.list.setData(reorderBaseInput, (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          items: reorderedItems,
        };
      });

      reorder.sync(reorderedItems.map((item) => item.id));
      await invalidateAfterCmsMutation(trpcUtils, "issues.reorder", {
        ids: nextOrder,
      });
      cmsToast.info(listText.reorderUpdated);
    } catch (error) {
      reorder.reset();
      const mapped = mapQuickActionError(error);
      cmsToast.error(mapped.description, mapped.title);
    }
  };

  const handleIssueDrop = async (activeId: string, overId: string) => {
    const activeIndex = reorder.orderedIds.indexOf(activeId);
    const overIndex = reorder.orderedIds.indexOf(overId);

    if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) {
      return;
    }

    const nextOrder = arrayMove(reorder.orderedIds, activeIndex, overIndex);

    reorder.sync(nextOrder);

    await persistIssueOrder(nextOrder);
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
              ? quickText.confirmDeleteIssueSingle
              : quickText.confirmDeleteIssueBulk(selectedCount),
        }),
        isEnabled: ({ selectedCount, isPending }) => selectedCount > 0 && !isPending,
      } satisfies CmsQuickAction,
    ],
    {
      selectedCount: selection.selectedCount,
      isPending: isActionPending,
    },
  );

  const hasActiveFilters = Boolean(
    input.query?.q || input.query?.isActive !== undefined || input.query?.published !== undefined,
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CmsPageHeader
        title={text.navigation.issues}
        actions={
          <div className="flex items-center gap-2">
            <CmsActionButton
              variant="outline"
              onClick={() => navigateToCrudRoute(cmsCrudRoutes.issues.create)}
            >
              {text.resource.new}
            </CmsActionButton>
          </div>
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
                onExecute: () => runBulkAction("delete"),
              }))}
              onSelectAll={
                pageIssueIds.length > 0 && !allSelectedOnPage
                  ? () => selection.setSelection(pageIssueIds)
                  : undefined
              }
              selectAllDisabled={isActionPending}
            />

            <div className="grid gap-3 lg:grid-cols-3">
              <CmsListSearchInput
                key={input.query?.q ?? ""}
                initialValue={input.query?.q ?? ""}
                placeholder={text.listToolbar.searchPlaceholder}
                className="col-span-1 lg:col-span-1"
                onSearchChange={(value) => {
                  updateSearchParams({ q: value, page: 1 });
                }}
              />
              <div className="grid grid-cols-4 gap-2 col-span-1 lg:col-span-2">
                <CmsSelect
                  value={input.query?.isActive ?? "all"}
                  onValueChange={(value) => {
                    updateSearchParams({ isActive: value === "all" ? undefined : value, page: 1 });
                  }}
                  options={[
                    { value: "all", label: optionsText.statusAllMasculine },
                    { value: "true", label: optionsText.activeOnlyFeminine },
                    { value: "false", label: optionsText.inactiveOnlyFeminine },
                  ]}
                />

                <CmsSelect
                  value={input.query?.published ?? "all"}
                  onValueChange={(value) => {
                    updateSearchParams({ published: value === "all" ? undefined : value, page: 1 });
                  }}
                  options={[
                    { value: "all", label: optionsText.publicationAll },
                    { value: "true", label: optionsText.publicationOnly },
                    { value: "false", label: optionsText.publicationNot },
                  ]}
                />

                <CmsSelect
                  value={input.query?.sortBy ?? "createdAt"}
                  onValueChange={(value) => {
                    updateSearchParams({ sortBy: value, page: 1 });
                  }}
                  options={[
                    { value: "createdAt", label: optionsText.sortCreatedAt },
                    { value: "sortOrder", label: optionsText.sortOrder },
                    { value: "publishedAt", label: optionsText.sortPublishedAt },
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
          displayedIssues.length > 0 ? (
            <DndContext
              id="cms-issues-list-dnd"
              sensors={sortableSensors}
              collisionDetection={closestCenter}
              onDragEnd={({ active, over }) => {
                if (!canReorder || reorderMutation.isPending || !over) {
                  return;
                }

                void handleIssueDrop(String(active.id), String(over.id));
              }}
            >
              <Table className={cmsTableClasses.table}>
                <TableHeader>
                  <TableRow className={cmsTableClasses.headerRow}>
                    <TableHead
                      className={cn(cmsTableClasses.headerCell, cmsTableClasses.selectionCell)}
                    >
                      <div
                        className={cmsTableClasses.selectionCellInner}
                        onPointerDownCapture={stopRowReorder}
                      >
                        <Checkbox
                          checked={allSelectedOnPage}
                          disabled={isActionPending}
                          onCheckedChange={() => {
                            selection.toggleSelectAll(pageIssueIds);
                          }}
                          className={cmsTableClasses.headerCheckbox}
                          aria-label={commonText.selectAll}
                        />
                      </div>
                    </TableHead>
                    <TableHead className={cmsTableClasses.headerCell}>
                      {listText.table.title}
                    </TableHead>
                    <TableHead className={cmsTableClasses.headerCell}>
                      {listText.table.slug}
                    </TableHead>
                    <TableHead className={cmsTableClasses.headerCell}>
                      {listText.table.status}
                    </TableHead>
                    <TableHead className={cmsTableClasses.headerCell}>
                      {listText.table.published}
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
                  <SortableContext
                    items={displayedIssues.map((issue) => issue.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {displayedIssues.map((issue) => (
                      <SortableIssueRow
                        key={issue.id}
                        issue={issue}
                        canReorder={canReorder}
                        isPending={isActionPending}
                        isSelected={selection.isSelected(issue.id)}
                        onToggleSelection={selection.toggleSelection}
                        onEdit={(id) => navigateToCrudRoute(cmsCrudRoutes.issues.edit(id))}
                        onDelete={(id) => runSingleAction("delete", id)}
                        selectLabel={listText.selectItem(issue.title)}
                        editLabel={quickText.edit}
                        deleteLabel={quickText.delete}
                        deleteConfirmTitle={quickText.confirmDeleteTitle}
                        deleteConfirmDescription={quickText.confirmDeleteSingleIssue}
                        activeLabel={listText.active}
                        inactiveLabel={listText.inactive}
                      />
                    ))}
                  </SortableContext>
                </TableBody>
              </Table>
            </DndContext>
          ) : (
            <div className="px-5 py-4">
              <CmsEmptyState
                title={text.resource.emptyTitle(text.navigation.issues)}
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
