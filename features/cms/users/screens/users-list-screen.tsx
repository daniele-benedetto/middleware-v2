"use client";

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
  useCmsListUrlState,
  useListSelection,
  useUsersListQuery,
} from "@/features/cms/shared/hooks";
import { cmsCrudRoutes } from "@/lib/cms/crud-routes";
import { parseUsersListSearchParams } from "@/lib/cms/query";
import { invalidateAfterCmsMutation, mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

import type { UsersListInitialData } from "@/features/cms/shared/types/initial-data";
import type { RouterInputs } from "@/lib/trpc/types";

type UsersListInput = RouterInputs["users"]["list"];

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("it-IT");
}

type UserQuickAction = "role-admin" | "role-editor" | "delete";

type CmsUsersListScreenProps = {
  initialInput?: UsersListInput;
  initialData?: UsersListInitialData;
  currentUserId?: string;
};

export function CmsUsersListScreen({
  initialInput,
  initialData,
  currentUserId,
}: CmsUsersListScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const text = i18n.cms;
  const listText = text.lists.users;
  const commonText = text.common;
  const quickText = text.quickActions;
  const optionsText = text.listOptions;

  const input = parseUsersListSearchParams(searchParams);
  const listQuery = useUsersListQuery(input, { initialDataInput: initialInput, initialData });
  const trpcUtils = trpc.useUtils();
  const selection = useListSelection();
  const updateRoleMutation = trpc.users.updateRole.useMutation();
  const deleteMutation = trpc.users.delete.useMutation();

  const navigateToCrudRoute = (href: string) => {
    router.push(href);
  };

  const { updateSearchParams } = useCmsListUrlState({
    baseParams: {
      page: input.page,
      pageSize: input.pageSize,
      q: input.query?.q,
      sortBy: input.query?.sortBy,
      sortOrder: input.query?.sortOrder,
      role: input.query?.role,
    },
    clearSelection: selection.clearSelection,
  });

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

  const pageActionableUserIds = listQuery.items
    .filter((user) => user.id !== currentUserId)
    .map((user) => user.id);
  const allSelectedOnPage =
    pageActionableUserIds.length > 0 &&
    pageActionableUserIds.every((userId) => selection.isSelected(userId));

  const runSingleAction = async (action: UserQuickAction, id: string) => {
    try {
      if (action === "role-admin") {
        await updateRoleMutation.mutateAsync({ id, data: { role: "ADMIN" } });
      }

      if (action === "role-editor") {
        await updateRoleMutation.mutateAsync({ id, data: { role: "EDITOR" } });
      }

      if (action === "delete") {
        await deleteMutation.mutateAsync({ id });
      }

      const mutationName = action === "delete" ? "users.delete" : ("users.updateRole" as const);

      await invalidateAfterCmsMutation(trpcUtils, mutationName, { id });
      selection.clearSelection();
      cmsToast.info(commonText.actionCompleted);
    } catch (error) {
      const mapped = mapQuickActionError(error);
      cmsToast.error(mapped.description, mapped.title);
    }
  };

  const runBulkAction = async (action: UserQuickAction) => {
    if (!selection.hasSelection) {
      return;
    }

    const selectedIds = [...selection.selectedIds];

    const result = await executeBulk(selectedIds, (id) => {
      if (action === "role-admin") {
        return updateRoleMutation.mutateAsync({ id, data: { role: "ADMIN" } });
      }

      if (action === "role-editor") {
        return updateRoleMutation.mutateAsync({ id, data: { role: "EDITOR" } });
      }

      if (action === "delete") {
        return deleteMutation.mutateAsync({ id });
      }

      return Promise.resolve();
    });

    const mutationName = action === "delete" ? "users.delete" : ("users.updateRole" as const);

    await invalidateAfterCmsMutation(trpcUtils, mutationName, { ids: selectedIds });
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
        id: "bulk-role-admin",
        label: quickText.setAdmin,
        scope: "bulk",
        requiresConfirm: ({ selectedCount }) => selectedCount > 0,
        confirm: ({ selectedCount }) => ({
          title: quickText.confirmRoleTitle,
          description:
            selectedCount === 1
              ? quickText.confirmRoleAdminBulkSingle
              : quickText.confirmRoleAdminBulk(selectedCount),
        }),
        isEnabled: ({ selectedCount, isPending }) => selectedCount > 0 && !isPending,
      } satisfies CmsQuickAction,
      {
        id: "bulk-role-editor",
        label: quickText.setEditor,
        scope: "bulk",
        requiresConfirm: ({ selectedCount }) => selectedCount > 0,
        confirm: ({ selectedCount }) => ({
          title: quickText.confirmRoleTitle,
          description:
            selectedCount === 1
              ? quickText.confirmRoleEditorBulkSingle
              : quickText.confirmRoleEditorBulk(selectedCount),
        }),
        isEnabled: ({ selectedCount, isPending }) => selectedCount > 0 && !isPending,
      } satisfies CmsQuickAction,
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
              ? quickText.confirmDeleteUserSingle
              : quickText.confirmDeleteUserBulk(selectedCount),
        }),
        isEnabled: ({ selectedCount, isPending }) => selectedCount > 0 && !isPending,
      } satisfies CmsQuickAction,
    ],
    {
      selectedCount: selection.selectedCount,
      isPending: deleteMutation.isPending || updateRoleMutation.isPending,
    },
  );

  const hasActiveFilters = Boolean(input.query?.q || input.query?.role !== undefined);
  const isActionPending = deleteMutation.isPending || updateRoleMutation.isPending;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CmsPageHeader
        title={text.navigation.users}
        actions={
          <CmsActionButton
            variant="outline"
            onClick={() => navigateToCrudRoute(cmsCrudRoutes.users.create)}
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
                  if (action.id === "bulk-role-admin") {
                    return runBulkAction("role-admin");
                  }

                  if (action.id === "bulk-role-editor") {
                    return runBulkAction("role-editor");
                  }

                  return runBulkAction("delete");
                },
              }))}
              onSelectAll={
                pageActionableUserIds.length > 0 && !allSelectedOnPage
                  ? () => selection.setSelection(pageActionableUserIds)
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
              <div className="grid grid-cols-3 gap-2 col-span-1 lg:col-span-2">
                <CmsSelect
                  value={input.query?.role ?? "all"}
                  onValueChange={(value) => {
                    updateSearchParams({ role: value === "all" ? undefined : value, page: 1 });
                  }}
                  options={[
                    { value: "all", label: optionsText.roleAll },
                    { value: "ADMIN", label: optionsText.roleAdminOnly },
                    { value: "EDITOR", label: optionsText.roleEditorOnly },
                  ]}
                />

                <CmsSelect
                  value={input.query?.sortBy ?? "createdAt"}
                  onValueChange={(value) => {
                    updateSearchParams({ sortBy: value, page: 1 });
                  }}
                  options={[
                    { value: "createdAt", label: optionsText.sortCreatedAt },
                    { value: "email", label: optionsText.sortEmail },
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
                  <TableHead
                    className={cn(cmsTableClasses.headerCell, cmsTableClasses.selectionCell)}
                  >
                    <div className={cmsTableClasses.selectionCellInner}>
                      <Checkbox
                        checked={allSelectedOnPage}
                        onCheckedChange={() => {
                          selection.toggleSelectAll(pageActionableUserIds);
                        }}
                        className={cmsTableClasses.headerCheckbox}
                        aria-label={commonText.selectAll}
                      />
                    </div>
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.email}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.name}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.role}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.verified}
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
                {listQuery.items.map((user) => {
                  const isCurrentUser = user.id === currentUserId;

                  return (
                    <TableRow key={user.id} className={cmsTableClasses.bodyRow}>
                      <TableCell
                        className={cn(cmsTableClasses.bodyCellMeta, cmsTableClasses.selectionCell)}
                      >
                        <div className={cmsTableClasses.selectionCellInner}>
                          <Checkbox
                            checked={selection.isSelected(user.id)}
                            disabled={isCurrentUser}
                            onCheckedChange={() => {
                              selection.toggleSelection(user.id);
                            }}
                            aria-label={listText.selectItemByEmail(user.email)}
                          />
                        </div>
                      </TableCell>
                      <TableCell className={cmsTableClasses.bodyCellTitle}>{user.email}</TableCell>
                      <TableCell className={cmsTableClasses.bodyCellMeta}>
                        {user.name ?? "-"}
                      </TableCell>
                      <TableCell className={cmsTableClasses.bodyCellMeta}>{user.role}</TableCell>
                      <TableCell className={cmsTableClasses.bodyCellMeta}>
                        {user.emailVerified ? commonText.yes : commonText.no}
                      </TableCell>
                      <TableCell className={cmsTableClasses.bodyCellMeta}>
                        {String(user.authoredArticlesCount)}
                      </TableCell>
                      <TableCell className={cmsTableClasses.bodyCellMeta}>
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell className={cmsTableClasses.bodyCellMeta}>
                        {formatDate(user.updatedAt)}
                      </TableCell>
                      <TableCell className={cmsTableClasses.bodyCellMeta}>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <CmsActionButton
                            variant="outline"
                            size="xs"
                            disabled={deleteMutation.isPending || updateRoleMutation.isPending}
                            onClick={() => navigateToCrudRoute(cmsCrudRoutes.users.edit(user.id))}
                          >
                            {quickText.edit}
                          </CmsActionButton>
                          {resolveQuickActions(
                            [
                              {
                                id: "single-role-admin",
                                label: quickText.setAdmin,
                                scope: "single",
                                requiresConfirm: true,
                                confirm: {
                                  title: quickText.confirmRoleTitle,
                                  description: quickText.confirmRoleAdminSingle,
                                },
                                isVisible: () => !isCurrentUser && user.role !== "ADMIN",
                                isEnabled: ({ isPending }) => !isPending,
                              },
                              {
                                id: "single-role-editor",
                                label: quickText.setEditor,
                                scope: "single",
                                requiresConfirm: true,
                                confirm: {
                                  title: quickText.confirmRoleTitle,
                                  description: quickText.confirmRoleEditorSingle,
                                },
                                isVisible: () => !isCurrentUser && user.role !== "EDITOR",
                                isEnabled: ({ isPending }) => !isPending,
                              },
                              {
                                id: "single-delete",
                                label: quickText.delete,
                                scope: "single",
                                tone: "danger",
                                requiresConfirm: true,
                                confirm: {
                                  title: quickText.confirmDeleteTitle,
                                  description: quickText.confirmDeleteSingleUser,
                                },
                                isVisible: () => !isCurrentUser,
                                isEnabled: ({ isPending }) => !isPending,
                              },
                            ] satisfies CmsQuickAction[],
                            {
                              selectedCount: 1,
                              isPending: deleteMutation.isPending || updateRoleMutation.isPending,
                            },
                          ).map((action) => (
                            <CmsConfirmDialog
                              key={`${user.id}-${action.id}`}
                              triggerLabel={action.label}
                              triggerDisabled={action.disabled}
                              title={action.confirm?.title ?? commonText.defaultConfirmTitle}
                              description={
                                action.confirm?.description ??
                                commonText.defaultUserActionDescription
                              }
                              confirmLabel={action.confirm?.confirmLabel}
                              cancelLabel={action.confirm?.cancelLabel}
                              tone={action.tone === "danger" ? "danger" : "default"}
                              onConfirm={() => {
                                if (action.id === "single-role-admin") {
                                  return runSingleAction("role-admin", user.id);
                                }

                                if (action.id === "single-role-editor") {
                                  return runSingleAction("role-editor", user.id);
                                }

                                return runSingleAction("delete", user.id);
                              }}
                            />
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="px-5 py-4">
              <CmsEmptyState
                title={text.resource.emptyTitle(text.navigation.users)}
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
