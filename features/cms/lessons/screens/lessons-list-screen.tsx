"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

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
  cmsOptionsQueryOptions,
  useCmsListUrlState,
  useLessonsListQuery,
  useListSelection,
} from "@/features/cms/shared/hooks";
import { lessonCourseOptionsInput } from "@/lib/cms/course-options";
import { cmsCrudRoutes } from "@/lib/cms/crud-routes";
import { parseLessonsListSearchParams } from "@/lib/cms/query";
import { invalidateAfterCmsMutation, mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { cmsMetaLabelClass } from "@/lib/cms/ui/variants";
import { i18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

import type { LessonsListInitialData } from "@/features/cms/shared/types/initial-data";
import type { RouterInputs } from "@/lib/trpc/types";

type LessonsListInput = RouterInputs["lessons"]["list"];

type LessonStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("it-IT");
}

function formatLessonStatus(status: LessonStatus) {
  const listText = i18n.cms.lists.lessons;

  return {
    DRAFT: listText.statusDraft,
    PUBLISHED: listText.statusPublished,
    ARCHIVED: listText.statusArchived,
  }[status];
}

type LessonQuickAction = "delete";

type CmsLessonsListScreenProps = {
  initialInput?: LessonsListInput;
  initialData?: LessonsListInitialData;
};

type LessonTableRow = {
  id: string;
  title: string;
  slug: string;
  courseTitle: string | null;
  status: LessonStatus;
  publishedAt: string | null;
  createdAt: string;
};

type LessonListToolbarFiltersState = {
  courseIdValue: string;
  statusValue: string;
  sortByValue: string;
  sortOrderValue: string;
};

const defaultLessonListToolbarFilters: LessonListToolbarFiltersState = {
  courseIdValue: "all",
  statusValue: "all",
  sortByValue: "sortOrder",
  sortOrderValue: "asc",
};

function buildLessonListToolbarFiltersState(
  input: LessonsListInput,
): LessonListToolbarFiltersState {
  return {
    courseIdValue: input.query?.courseId ?? defaultLessonListToolbarFilters.courseIdValue,
    statusValue: input.query?.status ?? defaultLessonListToolbarFilters.statusValue,
    sortByValue: input.query?.sortBy ?? defaultLessonListToolbarFilters.sortByValue,
    sortOrderValue: input.query?.sortOrder ?? defaultLessonListToolbarFilters.sortOrderValue,
  };
}

function countActiveLessonListFilters(filters: LessonListToolbarFiltersState) {
  return [
    filters.courseIdValue !== defaultLessonListToolbarFilters.courseIdValue,
    filters.statusValue !== defaultLessonListToolbarFilters.statusValue,
    filters.sortByValue !== defaultLessonListToolbarFilters.sortByValue,
    filters.sortOrderValue !== defaultLessonListToolbarFilters.sortOrderValue,
  ].filter(Boolean).length;
}

type LessonListToolbarFieldsProps = {
  filters: LessonListToolbarFiltersState;
  courseOptions: Array<{ value: string; label: string }>;
  onCourseChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onSortByChange: (value: string) => void;
  onSortOrderChange: (value: string) => void;
};

function LessonListToolbarFields({
  filters,
  courseOptions,
  onCourseChange,
  onStatusChange,
  onSortByChange,
  onSortOrderChange,
}: LessonListToolbarFieldsProps) {
  const optionsText = i18n.cms.listOptions;
  const listText = i18n.cms.lists.lessons;

  return (
    <>
      <CmsSelect
        value={filters.courseIdValue}
        onValueChange={onCourseChange}
        options={courseOptions}
      />
      <CmsSelect
        value={filters.statusValue}
        onValueChange={onStatusChange}
        options={[
          { value: "all", label: optionsText.statusAllFeminine },
          { value: "DRAFT", label: listText.statusDraft },
          { value: "PUBLISHED", label: listText.statusPublished },
          { value: "ARCHIVED", label: listText.statusArchived },
        ]}
      />
      <CmsSelect
        value={filters.sortByValue}
        onValueChange={onSortByChange}
        options={[
          { value: "createdAt", label: optionsText.sortCreatedAt },
          { value: "sortOrder", label: optionsText.sortOrder },
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

type LessonRowProps = {
  lesson: LessonTableRow;
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
};

function LessonRow({
  lesson,
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
}: LessonRowProps) {
  return (
    <TableRow className={cmsTableClasses.bodyRow}>
      <TableCell className={cn(cmsTableClasses.bodyCellMeta, cmsTableClasses.selectionCell)}>
        <div className={cmsTableClasses.selectionCellInner}>
          <Checkbox
            checked={isSelected}
            disabled={isPending}
            onCheckedChange={() => {
              onToggleSelection(lesson.id);
            }}
            aria-label={selectLabel}
          />
        </div>
      </TableCell>
      <TableCell className={cmsTableClasses.bodyCellTitle}>{lesson.title}</TableCell>
      <TableCell className={cmsTableClasses.bodyCellMeta}>{lesson.courseTitle ?? "-"}</TableCell>
      <TableCell className={cmsTableClasses.bodyCellMeta}>{lesson.slug}</TableCell>
      <TableCell className={cmsTableClasses.bodyCellMeta}>
        {formatLessonStatus(lesson.status)}
      </TableCell>
      <TableCell className={cmsTableClasses.bodyCellMeta}>
        {formatDate(lesson.publishedAt)}
      </TableCell>
      <TableCell className={cmsTableClasses.bodyCellMeta}>{formatDate(lesson.createdAt)}</TableCell>
      <TableCell className={cmsTableClasses.bodyCellMeta}>
        <div className="flex items-center gap-1.5">
          <CmsActionButton
            variant="outline"
            size="xs"
            className={cmsTableClasses.rowActionButton}
            disabled={isPending}
            onClick={() => onEdit(lesson.id)}
          >
            <Pencil aria-hidden />
            {editLabel}
          </CmsActionButton>
          <CmsConfirmDialog
            triggerLabel={deleteLabel}
            triggerIcon={<Trash2 aria-hidden />}
            triggerClassName={cmsTableClasses.rowDeleteActionButton}
            triggerDisabled={isPending}
            title={deleteConfirmTitle}
            description={deleteConfirmDescription}
            tone="danger"
            onConfirm={() => onDelete(lesson.id)}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}

export function CmsLessonsListScreen({ initialInput, initialData }: CmsLessonsListScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const text = i18n.cms;
  const listText = text.lists.lessons;
  const commonText = text.common;
  const quickText = text.quickActions;
  const optionsText = text.listOptions;

  const input = parseLessonsListSearchParams(searchParams);
  const currentToolbarFilters = buildLessonListToolbarFiltersState(input);
  const [draftToolbarFilters, setDraftToolbarFilters] = useState(currentToolbarFilters);
  const listQuery = useLessonsListQuery(input, { initialDataInput: initialInput, initialData });
  const trpcUtils = trpc.useUtils();
  const selection = useListSelection();

  const courseOptionsQuery = trpc.courses.list.useQuery(
    lessonCourseOptionsInput,
    cmsOptionsQueryOptions,
  );

  const courseFilterOptions = useMemo(() => {
    const items = courseOptionsQuery.data?.items ?? [];
    return [
      { value: "all", label: optionsText.courseAll },
      ...items.map((course) => ({ value: course.id, label: course.title })),
    ];
  }, [courseOptionsQuery.data?.items, optionsText.courseAll]);

  const navigateToCrudRoute = (href: string) => {
    router.push(href);
  };

  const deleteMutation = trpc.lessons.delete.useMutation();

  const { updateSearchParams } = useCmsListUrlState({
    baseParams: {
      page: input.page,
      pageSize: input.pageSize,
      q: input.query?.q,
      sortBy: input.query?.sortBy,
      sortOrder: input.query?.sortOrder,
      status: input.query?.status,
      courseId: input.query?.courseId,
    },
    clearSelection: selection.clearSelection,
  });

  const displayedLessons = listQuery.items;

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

  const pageLessonIds = displayedLessons.map((lesson) => lesson.id);
  const allSelectedOnPage =
    pageLessonIds.length > 0 && pageLessonIds.every((lessonId) => selection.isSelected(lessonId));

  const runSingleAction = async (action: LessonQuickAction, id: string) => {
    try {
      if (action === "delete") {
        await deleteMutation.mutateAsync({ id });
      }

      await invalidateAfterCmsMutation(trpcUtils, "lessons.delete", { id });
      selection.clearSelection();
      cmsToast.success(commonText.actionCompleted);
    } catch (error) {
      const mapped = mapQuickActionError(error);
      cmsToast.error(mapped.description, mapped.title);
    }
  };

  const runBulkAction = async (action: LessonQuickAction) => {
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

    await invalidateAfterCmsMutation(trpcUtils, "lessons.delete", { ids: selectedIds });
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
          description:
            selectedCount === 1
              ? quickText.confirmDeleteLessonSingle
              : quickText.confirmDeleteLessonBulk(selectedCount),
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
    input.query?.q || input.query?.status !== undefined || input.query?.courseId !== undefined,
  );
  const activeFiltersCount = countActiveLessonListFilters(currentToolbarFilters);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CmsPageHeader
        title={text.navigation.lessons}
        actions={
          <div className="flex items-center gap-2">
            <CmsActionButton
              variant="outline"
              onClick={() => navigateToCrudRoute(cmsCrudRoutes.lessons.create)}
            >
              <Plus aria-hidden />
              {text.resource.new}
            </CmsActionButton>
          </div>
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
                onSearchChange={(value) => {
                  updateSearchParams({ q: value, page: 1 });
                }}
              />

              <CmsBulkActionBar
                selectedCount={selection.selectedCount}
                actions={bulkActions.map((action) => ({
                  ...action,
                  onExecute: () => runBulkAction("delete"),
                }))}
                className="md:justify-self-end"
              />

              <CmsListFiltersSheet
                activeFiltersCount={activeFiltersCount}
                className="md:w-36"
                onOpenChange={(open) => {
                  if (open) {
                    setDraftToolbarFilters(currentToolbarFilters);
                  }
                }}
                onApply={() => {
                  updateSearchParams({
                    courseId:
                      draftToolbarFilters.courseIdValue === "all"
                        ? undefined
                        : draftToolbarFilters.courseIdValue,
                    status:
                      draftToolbarFilters.statusValue === "all"
                        ? undefined
                        : draftToolbarFilters.statusValue,
                    sortBy: draftToolbarFilters.sortByValue,
                    sortOrder: draftToolbarFilters.sortOrderValue,
                    page: 1,
                  });
                }}
                onClear={() => {
                  setDraftToolbarFilters(defaultLessonListToolbarFilters);
                }}
              >
                <LessonListToolbarFields
                  filters={draftToolbarFilters}
                  courseOptions={courseFilterOptions}
                  onCourseChange={(value) => {
                    setDraftToolbarFilters((current) => ({ ...current, courseIdValue: value }));
                  }}
                  onStatusChange={(value) => {
                    setDraftToolbarFilters((current) => ({ ...current, statusValue: value }));
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
          displayedLessons.length > 0 ? (
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
                        onCheckedChange={() => {
                          selection.toggleSelectAll(pageLessonIds);
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
                    {listText.table.course}
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
                    {listText.table.createdAt}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.actions}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedLessons.map((lesson) => (
                  <LessonRow
                    key={lesson.id}
                    lesson={lesson}
                    isPending={isActionPending}
                    isSelected={selection.isSelected(lesson.id)}
                    onToggleSelection={selection.toggleSelection}
                    onEdit={(id) => navigateToCrudRoute(cmsCrudRoutes.lessons.edit(id))}
                    onDelete={(id) => runSingleAction("delete", id)}
                    selectLabel={listText.selectItem(lesson.title)}
                    editLabel={quickText.edit}
                    deleteLabel={quickText.delete}
                    deleteConfirmTitle={quickText.confirmDeleteTitle}
                    deleteConfirmDescription={quickText.confirmDeleteSingleLesson}
                  />
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="px-5 py-4">
              <CmsEmptyState
                title={text.resource.emptyTitle(text.navigation.lessons)}
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
