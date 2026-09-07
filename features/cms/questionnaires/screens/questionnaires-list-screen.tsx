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
import { useCmsListUrlState, useListSelection } from "@/features/cms/shared/hooks";
import { cmsCrudRoutes } from "@/lib/cms/crud-routes";
import { parseQuestionnairesListSearchParams } from "@/lib/cms/query";
import { mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { cmsMetaLabelClass } from "@/lib/cms/ui/variants";
import { i18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

import type { QuestionnairesListInitialData } from "@/features/cms/shared/types/initial-data";
import type { RouterInputs } from "@/lib/trpc/types";

type QuestionnairesListInput = RouterInputs["questionnaires"]["list"];
type Props = {
  initialInput?: QuestionnairesListInput;
  initialData?: QuestionnairesListInitialData;
};
type Filters = { status: string; sortBy: string; sortOrder: string };
const defaults: Filters = { status: "all", sortBy: "updatedAt", sortOrder: "desc" };

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("it-IT");
}
function getFilters(input: QuestionnairesListInput): Filters {
  return {
    status: input.query?.status ?? defaults.status,
    sortBy: input.query?.sortBy ?? defaults.sortBy,
    sortOrder: input.query?.sortOrder ?? defaults.sortOrder,
  };
}
function FiltersFields({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
}) {
  const text = i18n.cms.lists.questionnaires;
  return (
    <>
      <CmsSelect
        value={filters.status}
        onValueChange={(status) => onChange({ ...filters, status })}
        options={[
          { value: "all", label: text.statusAll },
          { value: "DRAFT", label: text.statusDraft },
          { value: "PUBLISHED", label: text.statusPublished },
          { value: "CLOSED", label: text.statusClosed },
          { value: "ARCHIVED", label: text.statusArchived },
        ]}
      />
      <CmsSelect
        value={filters.sortBy}
        onValueChange={(sortBy) => onChange({ ...filters, sortBy })}
        options={[
          { value: "updatedAt", label: text.sortUpdatedAt },
          { value: "createdAt", label: text.sortCreatedAt },
          { value: "publishedAt", label: text.sortPublishedAt },
          { value: "closedAt", label: text.sortClosedAt },
          { value: "title", label: text.sortTitle },
        ]}
      />
      <CmsSelect
        value={filters.sortOrder}
        onValueChange={(sortOrder) => onChange({ ...filters, sortOrder })}
        options={[
          { value: "desc", label: text.sortDescending },
          { value: "asc", label: text.sortAscending },
        ]}
      />
    </>
  );
}

export function CmsQuestionnairesListScreen({ initialInput, initialData }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const trpcUtils = trpc.useUtils();
  const text = i18n.cms;
  const listText = text.lists.questionnaires;
  const input = parseQuestionnairesListSearchParams(searchParams);
  const currentFilters = getFilters(input);
  const [draftFilters, setDraftFilters] = useState(currentFilters);
  const listQuery = trpc.questionnaires.list.useQuery(input, {
    initialData:
      initialInput && JSON.stringify(input) === JSON.stringify(initialInput)
        ? initialData
        : undefined,
  });
  const deleteMutation = trpc.questionnaires.delete.useMutation();
  const selection = useListSelection();
  const { updateSearchParams } = useCmsListUrlState({
    baseParams: {
      page: input.page,
      pageSize: input.pageSize,
      q: input.query?.q,
      status: input.query?.status,
      sortBy: input.query?.sortBy,
      sortOrder: input.query?.sortOrder,
    },
    clearSelection: selection.clearSelection,
  });
  if (listQuery.isPending) return <CmsLoadingState />;
  if (listQuery.isError) {
    const error = mapTrpcErrorToCmsUiMessage(listQuery.error);
    return (
      <CmsErrorState
        title={error.title}
        description={error.description}
        onRetry={error.retryable ? listQuery.refetch : undefined}
      />
    );
  }
  const ids = listQuery.data.items.map((item) => item.id);
  const allSelected = ids.length > 0 && ids.every(selection.isSelected);
  const pending = deleteMutation.isPending;
  const runDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync({ id });
      await trpcUtils.questionnaires.list.invalidate();
      selection.clearSelection();
      cmsToast.success(text.common.actionCompleted);
    } catch (error) {
      const mapped = mapQuickActionError(error);
      cmsToast.error(mapped.description, mapped.title);
    }
  };
  const bulkActions = resolveQuickActions(
    [
      {
        id: "bulk-delete",
        label: text.quickActions.delete,
        scope: "bulk",
        tone: "danger",
        requiresConfirm: ({ selectedCount }) => selectedCount > 0,
        confirm: ({ selectedCount }) => ({
          title: listText.deleteBulkTitle,
          description: listText.deleteBulkDescription(selectedCount),
        }),
        isEnabled: ({ selectedCount, isPending }) => selectedCount > 0 && !isPending,
      } satisfies CmsQuickAction,
    ],
    { selectedCount: selection.selectedCount, isPending: pending },
  );
  const activeCount = Object.entries(currentFilters).filter(
    ([key, value]) => value !== defaults[key as keyof Filters],
  ).length;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <CmsPageHeader
        title={text.navigation.questionnaires}
        actions={
          <CmsActionButton
            variant="outline"
            onClick={() => router.push(cmsCrudRoutes.questionnaires.create)}
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
              {listText.totalRecords(listQuery.data.pagination.total)}
            </div>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
              <CmsListSearchInput
                initialValue={input.query?.q ?? ""}
                placeholder={listText.searchPlaceholder}
                onSearchChange={(q) => updateSearchParams({ q, page: 1 })}
              />
              <CmsBulkActionBar
                selectedCount={selection.selectedCount}
                actions={bulkActions.map((action) => ({
                  ...action,
                  onExecute: async () => {
                    const selected = [...selection.selectedIds];
                    const result = await executeBulk(selected, runDelete);
                    selection.clearSelection();
                    if (result.failed) {
                      const mapped = mapBulkQuickActionError(result);
                      if (mapped) cmsToast.error(mapped.description, mapped.title);
                    }
                  },
                }))}
                className="md:justify-self-end"
              />
              <CmsListFiltersSheet
                activeFiltersCount={activeCount}
                className="md:w-36"
                onOpenChange={(open) => {
                  if (open) setDraftFilters(currentFilters);
                }}
                onApply={() =>
                  updateSearchParams({
                    status: draftFilters.status === "all" ? undefined : draftFilters.status,
                    sortBy: draftFilters.sortBy,
                    sortOrder: draftFilters.sortOrder,
                    page: 1,
                  })
                }
                onClear={() => setDraftFilters(defaults)}
              >
                <FiltersFields filters={draftFilters} onChange={setDraftFilters} />
              </CmsListFiltersSheet>
            </div>
          </div>
        }
        table={
          listQuery.data.items.length ? (
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
                        checked={allSelected}
                        disabled={pending}
                        onCheckedChange={() => selection.toggleSelectAll(ids)}
                        className={cmsTableClasses.headerCheckbox}
                        aria-label={listText.selectAll}
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
                    {listText.table.responses}
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
                {listQuery.data.items.map((item) => (
                  <TableRow key={item.id} className={cmsTableClasses.bodyRow}>
                    <TableCell
                      className={cn(cmsTableClasses.bodyCellMeta, cmsTableClasses.selectionCell)}
                    >
                      <div className={cmsTableClasses.selectionCellInner}>
                        <Checkbox
                          checked={selection.isSelected(item.id)}
                          disabled={pending}
                          onCheckedChange={() => selection.toggleSelection(item.id)}
                          aria-label={listText.selectItem(item.title)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellTitle}>{item.title}</TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>{item.slug}</TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>{item.status}</TableCell>
                    <TableCell className={cmsTableClasses.bodyCellNumeric}>
                      {item.responseCount}
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
                          onClick={() => router.push(cmsCrudRoutes.questionnaires.edit(item.id))}
                          disabled={pending}
                        >
                          <Pencil aria-hidden />
                          {text.quickActions.edit}
                        </CmsActionButton>
                        <CmsConfirmDialog
                          triggerLabel={text.quickActions.delete}
                          triggerIcon={<Trash2 aria-hidden />}
                          triggerClassName={cmsTableClasses.rowDeleteActionButton}
                          triggerDisabled={pending}
                          title={listText.deleteTitle}
                          description={listText.deleteDescription}
                          tone="danger"
                          onConfirm={() => runDelete(item.id)}
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
                title={text.resource.emptyTitle(text.navigation.questionnaires)}
                description={text.resource.emptyDescription}
                descriptionFiltered={text.resource.emptyDescriptionFiltered}
                hasActiveFilters={Boolean(input.query?.q || input.query?.status)}
              />
            </div>
          )
        }
        pagination={
          <CmsPaginationFooter
            currentPage={listQuery.data.pagination.page}
            totalPages={Math.max(
              1,
              Math.ceil(listQuery.data.pagination.total / listQuery.data.pagination.pageSize),
            )}
            pageSize={listQuery.data.pagination.pageSize}
            onPageChange={(page) => updateSearchParams({ page })}
            onPageSizeChange={(pageSize) => updateSearchParams({ pageSize, page: 1 })}
          />
        }
      />
    </div>
  );
}
