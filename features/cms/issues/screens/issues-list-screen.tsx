"use client";

import { ArrowDown, ArrowUp, Save } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIssuesListQuery } from "@/features/cms/shared/hooks";
import { parseIssuesListSearchParams, serializeCmsSearchParams } from "@/lib/cms/query";
import { mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc/react";

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("it-IT");
}

function areSameOrder(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

export function CmsIssuesListScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const text = i18n.cms;

  const input = parseIssuesListSearchParams(searchParams);
  const listQuery = useIssuesListQuery(input);

  const [searchValue, setSearchValue] = useState(() => input.query?.q ?? "");
  const [orderedIssueIds, setOrderedIssueIds] = useState<string[]>([]);

  const reorderMutation = trpc.issues.reorder.useMutation();

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

  const issuesById = useMemo(
    () => new Map(listQuery.items.map((issue) => [issue.id, issue])),
    [listQuery.items],
  );

  const serverOrder = listQuery.items.map((issue) => issue.id);

  const normalizedOrder = useMemo(() => {
    const sameLength = orderedIssueIds.length === serverOrder.length;
    const knownIds = sameLength && orderedIssueIds.every((id) => issuesById.has(id));

    return sameLength && knownIds ? orderedIssueIds : serverOrder;
  }, [issuesById, orderedIssueIds, serverOrder]);

  const displayedIssues = useMemo(() => {
    if (!canReorder) {
      return listQuery.items;
    }

    return normalizedOrder
      .map((issueId) => issuesById.get(issueId))
      .filter((issue): issue is NonNullable<typeof issue> => Boolean(issue));
  }, [canReorder, issuesById, listQuery.items, normalizedOrder]);

  const hasOrderChanges = canReorder && !areSameOrder(normalizedOrder, serverOrder);

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

  return (
    <div className="space-y-6">
      <CmsPageHeader
        title={text.navigation.issues}
        subtitle="Filtri, ricerca, ordinamento, paginazione e riordino integrati via tRPC."
      />

      <CmsDataTableShell
        toolbar={
          <div className="space-y-3">
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

            <div className="flex items-center justify-between gap-3 max-sm:flex-col max-sm:items-stretch">
              <CmsMetaText variant="tiny" className="block">
                Reorder disponibile con `sortBy=sortOrder`, `sortOrder=asc`, senza filtri e con una
                sola pagina.
              </CmsMetaText>

              <CmsActionButton
                variant="outline-accent"
                size="xs"
                disabled={!hasOrderChanges || reorderMutation.isPending}
                isLoading={reorderMutation.isPending}
                onClick={() => {
                  if (!hasOrderChanges) {
                    return;
                  }

                  reorderMutation.mutate(
                    { orderedIssueIds: normalizedOrder },
                    {
                      onSuccess: async () => {
                        cmsToast.info("Ordine issues aggiornato con successo.");
                        listQuery.retry();
                      },
                      onError: (error) => {
                        const mapped = mapTrpcErrorToCmsUiMessage(error);
                        cmsToast.error(mapped.description, mapped.title);
                      },
                    },
                  );
                }}
              >
                <Save className="size-3" />
                Salva ordine
              </CmsActionButton>
            </div>
          </div>
        }
        table={
          displayedIssues.length > 0 ? (
            <Table className={cmsTableClasses.table}>
              <TableHeader>
                <TableRow className={cmsTableClasses.headerRow}>
                  <TableHead className={cmsTableClasses.headerCell}>Titolo</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Slug</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Stato</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Pubblicata</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Ordine</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Articoli</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Creata</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Aggiornata</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Reorder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedIssues.map((issue, index) => (
                  <TableRow key={issue.id} className={cmsTableClasses.bodyRow}>
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
                      <div className="flex items-center gap-1">
                        <CmsActionButton
                          variant="outline"
                          size="xs"
                          disabled={!canReorder || index === 0 || reorderMutation.isPending}
                          onClick={() => {
                            setOrderedIssueIds((current) => {
                              const base =
                                current.length === serverOrder.length ? current : serverOrder;
                              const next = [...base];
                              const temp = next[index - 1];
                              next[index - 1] = next[index] ?? "";
                              next[index] = temp ?? "";
                              return next;
                            });
                          }}
                        >
                          <ArrowUp className="size-3" />
                        </CmsActionButton>

                        <CmsActionButton
                          variant="outline"
                          size="xs"
                          disabled={
                            !canReorder ||
                            index === displayedIssues.length - 1 ||
                            reorderMutation.isPending
                          }
                          onClick={() => {
                            setOrderedIssueIds((current) => {
                              const base =
                                current.length === serverOrder.length ? current : serverOrder;
                              const next = [...base];
                              const temp = next[index + 1];
                              next[index + 1] = next[index] ?? "";
                              next[index] = temp ?? "";
                              return next;
                            });
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
