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
import { useIssuesListQuery, useListSelection } from "@/features/cms/shared/hooks";
import { cmsCrudRoutes, cmsCrudRoutesEnabled } from "@/lib/cms/crud-routes";
import { parseIssuesListSearchParams, serializeCmsSearchParams } from "@/lib/cms/query";
import { invalidateAfterCmsMutation, mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc/react";

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

export function CmsIssuesListScreen({ initialInput, initialData }: CmsIssuesListScreenProps) {
  const router = useRouter();
  const pathname = usePathname();
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

  const [searchValue, setSearchValue] = useState(() => input.query?.q ?? "");

  const navigateToCrudRoute = (href: string) => {
    if (!cmsCrudRoutesEnabled) {
      cmsToast.info("Route CRUD non ancora attive.");
      return;
    }

    router.push(href);
  };

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

  const displayedIssues = listQuery.items;

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
          <CmsActionButton
            size="xs"
            variant="outline"
            onClick={() => navigateToCrudRoute(cmsCrudRoutes.issues.create)}
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
                pageIssueIds.length > 0 && !allSelectedOnPage
                  ? () => selection.setSelection(pageIssueIds)
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
            <Table className={cmsTableClasses.table}>
              <TableHeader>
                <TableRow className={cmsTableClasses.headerRow}>
                  <TableHead className={cmsTableClasses.headerCell}>
                    <Checkbox
                      checked={allSelectedOnPage}
                      onCheckedChange={() => {
                        selection.toggleSelectAll(pageIssueIds);
                      }}
                      className={cmsTableClasses.headerCheckbox}
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
                {displayedIssues.map((issue) => (
                  <TableRow key={issue.id} className={cmsTableClasses.bodyRow}>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      <Checkbox
                        checked={selection.isSelected(issue.id)}
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
                      {String(issue.articlesCount)}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {formatDate(issue.createdAt)}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {formatDate(issue.updatedAt)}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      <div className="flex items-center gap-2">
                        <CmsActionButton
                          variant="outline"
                          size="xs"
                          onClick={() => navigateToCrudRoute(cmsCrudRoutes.issues.edit(issue.id))}
                          disabled={isActionPending}
                        >
                          {quickText.edit}
                        </CmsActionButton>
                        <CmsConfirmDialog
                          triggerLabel={quickText.delete}
                          triggerDisabled={isActionPending}
                          title={quickText.confirmDeleteTitle}
                          description={quickText.confirmDeleteSingleIssue}
                          tone="danger"
                          onConfirm={() => {
                            void runSingleAction("delete", issue.id);
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
