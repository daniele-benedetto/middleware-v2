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

  const unavailableReorderMessage =
    "Reorder disponibile con `sortBy=sortOrder`, `sortOrder=asc`, senza filtri e con una sola pagina.";

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
      cmsToast.info("Azione completata.");
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
      cmsToast.info(`Azione completata su ${result.success} record.`);
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
        label: "Delete",
        scope: "bulk",
        tone: "danger",
        requiresConfirm: ({ selectedCount }) => selectedCount > 0,
        confirm: ({ selectedCount }) => ({
          title: "Conferma eliminazione",
          description:
            selectedCount === 1
              ? "Eliminerai definitivamente l'issue selezionata."
              : `Eliminerai definitivamente ${selectedCount} issues selezionate.`,
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
      <CmsPageHeader
        title={text.navigation.issues}
        subtitle="Filtri, ricerca, ordinamento, paginazione e riordino integrati via tRPC."
      />

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
                  { value: "all", label: "Stato: tutti" },
                  { value: "true", label: "Solo attive" },
                  { value: "false", label: "Solo non attive" },
                ]}
              />

              <CmsSelect
                value={input.query?.published ?? "all"}
                onValueChange={(value) => {
                  updateSearchParams({ published: value === "all" ? undefined : value, page: 1 });
                }}
                options={[
                  { value: "all", label: "Pubblicazione: tutte" },
                  { value: "true", label: "Solo pubblicate" },
                  { value: "false", label: "Solo non pubblicate" },
                ]}
              />

              <div className="grid grid-cols-2 gap-2">
                <CmsSelect
                  value={input.query?.sortBy ?? "createdAt"}
                  onValueChange={(value) => {
                    updateSearchParams({ sortBy: value, page: 1 });
                  }}
                  options={[
                    { value: "createdAt", label: "Sort: creazione" },
                    { value: "sortOrder", label: "Sort: ordine" },
                    { value: "publishedAt", label: "Sort: pubblicazione" },
                  ]}
                />

                <CmsSelect
                  value={input.query?.sortOrder ?? "desc"}
                  onValueChange={(value) => {
                    updateSearchParams({ sortOrder: value, page: 1 });
                  }}
                  options={[
                    { value: "desc", label: "DESC" },
                    { value: "asc", label: "ASC" },
                  ]}
                />
              </div>
            </div>

            <CmsReorderModeBar
              isAvailable={canReorder}
              isReorderMode={reorder.isReorderMode}
              hasChanges={hasOrderChanges}
              isSaving={reorderMutation.isPending}
              helpText="Modalita reorder attiva: usa le frecce per riordinare e salva per applicare le modifiche."
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
                      cmsToast.info("Ordine issues aggiornato con successo.");
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
                      aria-label="Seleziona tutti"
                    />
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Titolo</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Slug</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Stato</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Pubblicata</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Ordine</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Articoli</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Creata</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Aggiornata</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Azioni</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Reorder</TableHead>
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
                        aria-label={`Seleziona ${issue.title}`}
                      />
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellTitle}>{issue.title}</TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>{issue.slug}</TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {issue.isActive ? "Attiva" : "Non attiva"}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {issue.publishedAt ? "Si" : "No"}
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
                        triggerLabel="Delete"
                        triggerDisabled={isActionPending || reorder.isReorderMode}
                        title="Conferma eliminazione"
                        description="Eliminerai definitivamente questa issue."
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
                eyebrow="Issues"
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
        Totale: {listQuery.pagination.total} record
      </div>
    </div>
  );
}
