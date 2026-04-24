"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  CmsBulkActionBar,
  CmsConfirmDialog,
  CmsEmptyState,
  CmsErrorState,
  CmsLoadingState,
  CmsPaginationFooter,
  CmsReorderModeBar,
} from "@/components/cms/common";
import {
  CmsActionButton,
  CmsDataTableShell,
  CmsPageHeader,
  CmsSelect,
  CmsTextInput,
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
import { useIssuesListQuery, useListSelection, useReorderMode } from "@/features/cms/shared/hooks";
import { parseIssuesListSearchParams, serializeCmsSearchParams } from "@/lib/cms/query";
import { invalidateAfterCmsMutation, mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc/react";

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("it-IT");
}

type IssueQuickAction = "delete";

export function CmsIssuesListScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const text = i18n.cms;
  const listText = text.lists.issues;
  const commonText = text.common;
  const quickText = text.quickActions;
  const optionsText = text.listOptions;

  const input = parseIssuesListSearchParams(searchParams);
  const listQuery = useIssuesListQuery(input);
  const trpcUtils = trpc.useUtils();
  const selection = useListSelection();

  const [searchValue, setSearchValue] = useState(() => input.query?.q ?? "");

  const reorderMutation = trpc.issues.reorder.useMutation();
  const deleteMutation = trpc.issues.delete.useMutation();

  const updateSearchParams = useCallback(
    (patch: Record<string, string | number | undefined>) => {
      const nextParams = serializeCmsSearchParams({
        page: input.page,
        pageSize: input.pageSize,
        q: input.query?.q,
        sortBy: input.query?.sortBy,
        sortOrder: input.query?.sortOrder,
        isActive: input.query?.isActive,
        published: input.query?.published,
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
      input.query?.published,
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

  const canReorder =
    input.query?.sortBy === "sortOrder" &&
    input.query.sortOrder === "asc" &&
    !input.query.q &&
    input.query.isActive === undefined &&
    input.query.published === undefined &&
    listQuery.pagination.total === listQuery.items.length;
  const reorder = useReorderMode(listQuery.items);

  const displayedIssues = reorder.isReorderMode ? reorder.displayedItems : listQuery.items;
  const hasOrderChanges = canReorder && reorder.hasChanges;

  const unavailableReorderMessage = listText.reorderUnavailable;

  useEffect(() => {
    if (!canReorder && reorder.isReorderMode) {
      reorder.cancel();
    }
  }, [canReorder, reorder]);

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

  const isActionPending = reorderMutation.isPending || deleteMutation.isPending;

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
      isPending: isActionPending || reorder.isReorderMode,
    },
  );

  return (
    <div className="space-y-6">
      <CmsPageHeader title={text.navigation.issues} subtitle={listText.subtitle} />

      <CmsDataTableShell
        toolbar={
          <div className="space-y-3">
            <CmsBulkActionBar
              selectedCount={selection.selectedCount}
              actions={bulkActions.map((action) => ({
                ...action,
                onExecute: () => {
                  void runBulkAction("delete");
                },
              }))}
            />

            <div className="grid gap-3 lg:grid-cols-4">
              <CmsTextInput
                placeholder={text.listToolbar.searchPlaceholder}
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
              />

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

              <div className="grid grid-cols-2 gap-2">
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

            <CmsReorderModeBar
              isAvailable={canReorder}
              isReorderMode={reorder.isReorderMode}
              hasChanges={hasOrderChanges}
              isSaving={reorderMutation.isPending}
              helpText={listText.reorderHelp}
              unavailableText={unavailableReorderMessage}
              onStart={() => {
                selection.clearSelection();
                reorder.start();
              }}
              onCancel={() => {
                reorder.cancel();
              }}
              onSave={() => {
                if (!hasOrderChanges) {
                  return;
                }

                reorderMutation.mutate(
                  { orderedIssueIds: reorder.normalizedOrder },
                  {
                    onSuccess: async () => {
                      await invalidateAfterCmsMutation(trpcUtils, "issues.reorder", {
                        ids: reorder.normalizedOrder,
                      });
                      reorder.commit();
                      cmsToast.info(listText.reorderUpdated);
                    },
                    onError: (error) => {
                      const mapped = mapTrpcErrorToCmsUiMessage(error);
                      cmsToast.error(mapped.description, mapped.title);
                    },
                  },
                );
              }}
            />
          </div>
        }
        table={
          displayedIssues.length > 0 ? (
            <Table className={cmsTableClasses.table}>
              <TableHeader>
                <TableRow className={cmsTableClasses.headerRow}>
                  <TableHead className={cmsTableClasses.headerCell}>
                    <Checkbox
                      checked={allSelectedOnPage}
                      disabled={reorder.isReorderMode}
                      onCheckedChange={() => {
                        selection.toggleSelectAll(pageIssueIds);
                      }}
                      aria-label={commonText.selectAll}
                    />
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
                    {listText.table.order}
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
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.reorder}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedIssues.map((issue, index) => (
                  <TableRow key={issue.id} className={cmsTableClasses.bodyRow}>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      <Checkbox
                        checked={selection.isSelected(issue.id)}
                        disabled={reorder.isReorderMode}
                        onCheckedChange={() => {
                          selection.toggleSelection(issue.id);
                        }}
                        aria-label={listText.selectItem(issue.title)}
                      />
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellTitle}>{issue.title}</TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>{issue.slug}</TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {issue.isActive ? listText.active : listText.inactive}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {issue.publishedAt ? commonText.yes : commonText.no}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {String(issue.sortOrder)}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {String(issue.articlesCount)}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {formatDate(issue.createdAt)}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {formatDate(issue.updatedAt)}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      <CmsConfirmDialog
                        triggerLabel={quickText.delete}
                        triggerDisabled={isActionPending || reorder.isReorderMode}
                        title={quickText.confirmDeleteTitle}
                        description={quickText.confirmDeleteSingleIssue}
                        tone="danger"
                        onConfirm={() => {
                          void runSingleAction("delete", issue.id);
                        }}
                      />
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      <div className="flex items-center gap-1">
                        <CmsActionButton
                          variant="outline"
                          size="xs"
                          disabled={
                            !canReorder ||
                            !reorder.isReorderMode ||
                            index === 0 ||
                            reorderMutation.isPending
                          }
                          onClick={() => {
                            reorder.moveUp(index);
                          }}
                        >
                          <ArrowUp className="size-3" />
                        </CmsActionButton>

                        <CmsActionButton
                          variant="outline"
                          size="xs"
                          disabled={
                            !canReorder ||
                            !reorder.isReorderMode ||
                            index === displayedIssues.length - 1 ||
                            reorderMutation.isPending
                          }
                          onClick={() => {
                            reorder.moveDown(index);
                          }}
                        >
                          <ArrowDown className="size-3" />
                        </CmsActionButton>
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
                title={text.resource.emptyTitle(text.navigation.issues)}
                description={text.resource.emptyDescription}
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

      <div className="font-ui text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
        {commonText.totalRecords(listQuery.pagination.total)}
      </div>
    </div>
  );
}
