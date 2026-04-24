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
  CmsMetaText,
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
import { useListSelection, useUsersListQuery } from "@/features/cms/shared/hooks";
import { cmsCrudRoutes, cmsCrudRoutesEnabled } from "@/lib/cms/crud-routes";
import { parseUsersListSearchParams, serializeCmsSearchParams } from "@/lib/cms/query";
import { invalidateAfterCmsMutation, mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc/react";

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
};

export function CmsUsersListScreen({ initialInput, initialData }: CmsUsersListScreenProps) {
  const router = useRouter();
  const pathname = usePathname();
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

  const [searchValue, setSearchValue] = useState(() => input.query?.q ?? "");
  const updateRoleMutation = trpc.users.updateRole.useMutation();
  const deleteMutation = trpc.users.delete.useMutation();

  const navigateToCrudRoute = (href: string) => {
    if (!cmsCrudRoutesEnabled) {
      cmsToast.info("Route CRUD non ancora attive.");
      return;
    }

    router.push(href);
  };

  const updateSearchParams = useCallback(
    (patch: Record<string, string | number | undefined>) => {
      const nextParams = serializeCmsSearchParams({
        page: input.page,
        pageSize: input.pageSize,
        q: input.query?.q,
        sortBy: input.query?.sortBy,
        sortOrder: input.query?.sortOrder,
        role: input.query?.role,
        ...patch,
      });

      const next = nextParams.toString();
      selection.clearSelection();
      router.replace(next ? `${pathname}?${next}` : pathname);
    },
    [
      input.page,
      input.pageSize,
      input.query?.q,
      input.query?.role,
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

  const pageUserIds = listQuery.items.map((user) => user.id);
  const allSelectedOnPage =
    pageUserIds.length > 0 && pageUserIds.every((userId) => selection.isSelected(userId));

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

  return (
    <div className="space-y-6">
      <CmsPageHeader
        title={text.navigation.users}
        subtitle={listText.subtitle}
        actions={
          <CmsActionButton
            size="xs"
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
            <CmsBulkActionBar
              selectedCount={selection.selectedCount}
              actions={bulkActions.map((action) => ({
                ...action,
                onExecute: () => {
                  if (action.id === "bulk-role-admin") {
                    void runBulkAction("role-admin");
                    return;
                  }

                  if (action.id === "bulk-role-editor") {
                    void runBulkAction("role-editor");
                    return;
                  }

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

            <CmsMetaText variant="tiny" className="block">
              {commonText.contractPrefix} {listText.contract}
            </CmsMetaText>
          </div>
        }
        table={
          listQuery.items.length > 0 ? (
            <Table className={cmsTableClasses.table}>
              <TableHeader>
                <TableRow className={cmsTableClasses.headerRow}>
                  <TableHead className={cmsTableClasses.headerCell}>
                    <Checkbox
                      checked={allSelectedOnPage}
                      onCheckedChange={() => {
                        selection.toggleSelectAll(pageUserIds);
                      }}
                      aria-label={commonText.selectAll}
                    />
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
                {listQuery.items.map((user) => (
                  <TableRow key={user.id} className={cmsTableClasses.bodyRow}>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      <Checkbox
                        checked={selection.isSelected(user.id)}
                        onCheckedChange={() => {
                          selection.toggleSelection(user.id);
                        }}
                        aria-label={listText.selectItemByEmail(user.email)}
                      />
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
                          Edit
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
                              isVisible: () => user.role !== "ADMIN",
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
                              isVisible: () => user.role !== "EDITOR",
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
                              action.confirm?.description ?? commonText.defaultUserActionDescription
                            }
                            confirmLabel={action.confirm?.confirmLabel}
                            cancelLabel={action.confirm?.cancelLabel}
                            tone={action.tone === "danger" ? "danger" : "default"}
                            onConfirm={() => {
                              if (action.id === "single-role-admin") {
                                void runSingleAction("role-admin", user.id);
                                return;
                              }

                              if (action.id === "single-role-editor") {
                                void runSingleAction("role-editor", user.id);
                                return;
                              }

                              void runSingleAction("delete", user.id);
                            }}
                          />
                        ))}
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
                title={text.resource.emptyTitle(text.navigation.users)}
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
