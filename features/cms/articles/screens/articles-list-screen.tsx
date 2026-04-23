"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  CmsBulkActionBar,
  CmsEmptyState,
  CmsErrorState,
  CmsLoadingState,
  CmsPaginationFooter,
} from "@/components/cms/common";
import {
  CmsActionButton,
  cmsToast,
  CmsDataTableShell,
  CmsMetaText,
  CmsPageHeader,
  CmsSelect,
  CmsTextInput,
  cmsTableClasses,
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
import { executeBulk } from "@/features/cms/shared/actions";
import { useListSelection } from "@/features/cms/shared/hooks";
import { useArticlesListQuery } from "@/features/cms/shared/hooks";
import { parseArticlesListSearchParams, serializeCmsSearchParams } from "@/lib/cms/query";
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

export function CmsArticlesListScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const text = i18n.cms;

  const input = parseArticlesListSearchParams(searchParams);
  const listQuery = useArticlesListQuery(input);
  const trpcUtils = trpc.useUtils();

  const selection = useListSelection();

  const [searchValue, setSearchValue] = useState(() => input.query?.q ?? "");

  const publishMutation = trpc.articles.publish.useMutation();
  const unpublishMutation = trpc.articles.unpublish.useMutation();
  const archiveMutation = trpc.articles.archive.useMutation();
  const featureMutation = trpc.articles.feature.useMutation();
  const unfeatureMutation = trpc.articles.unfeature.useMutation();
  const deleteMutation = trpc.articles.delete.useMutation();

  const isActionPending =
    publishMutation.isPending ||
    unpublishMutation.isPending ||
    archiveMutation.isPending ||
    featureMutation.isPending ||
    unfeatureMutation.isPending ||
    deleteMutation.isPending;

  const issuesOptionsQuery = trpc.issues.list.useQuery(
    {
      page: 1,
      pageSize: 200,
      query: {
        sortBy: "sortOrder",
        sortOrder: "asc",
      },
    },
    { staleTime: 60_000 },
  );

  const categoriesOptionsQuery = trpc.categories.list.useQuery(
    {
      page: 1,
      pageSize: 200,
      query: {
        sortBy: "name",
        sortOrder: "asc",
      },
    },
    { staleTime: 60_000 },
  );

  const issueOptions = useMemo(() => {
    const items = issuesOptionsQuery.data?.items ?? [];
    return [
      { value: "all", label: "Issue: tutte" },
      ...items.map((issue) => ({ value: issue.id, label: issue.title })),
    ];
  }, [issuesOptionsQuery.data?.items]);

  const categoryOptions = useMemo(() => {
    const items = categoriesOptionsQuery.data?.items ?? [];
    return [
      { value: "all", label: "Categoria: tutte" },
      ...items.map((category) => ({ value: category.id, label: category.name })),
    ];
  }, [categoriesOptionsQuery.data?.items]);

  const updateSearchParams = useCallback(
    (patch: Record<string, string | number | undefined>) => {
      const nextParams = serializeCmsSearchParams({
        page: input.page,
        pageSize: input.pageSize,
        q: input.query?.q,
        sortBy: input.query?.sortBy,
        sortOrder: input.query?.sortOrder,
        status: input.query?.status,
        issueId: input.query?.issueId,
        categoryId: input.query?.categoryId,
        authorId: input.query?.authorId,
        featured: input.query?.featured,
        ...patch,
      });

      const next = nextParams.toString();
      selection.clearSelection();
      router.replace(next ? `${pathname}?${next}` : pathname);
    },
    [
      input.page,
      input.pageSize,
      input.query?.authorId,
      input.query?.categoryId,
      input.query?.featured,
      input.query?.issueId,
      input.query?.q,
      input.query?.sortBy,
      input.query?.sortOrder,
      input.query?.status,
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

  const pageArticleIds = listQuery.items.map((article) => article.id);
  const allSelectedOnPage =
    pageArticleIds.length > 0 &&
    pageArticleIds.every((articleId) => selection.isSelected(articleId));

  const runSingleAction = async (
    action: "publish" | "unpublish" | "archive" | "feature" | "unfeature" | "delete",
    id: string,
  ) => {
    try {
      if (action === "publish") await publishMutation.mutateAsync({ id });
      if (action === "unpublish") await unpublishMutation.mutateAsync({ id });
      if (action === "archive") await archiveMutation.mutateAsync({ id });
      if (action === "feature") await featureMutation.mutateAsync({ id });
      if (action === "unfeature") await unfeatureMutation.mutateAsync({ id });
      if (action === "delete") await deleteMutation.mutateAsync({ id });

      await trpcUtils.articles.list.invalidate();
      await trpcUtils.articles.getById.invalidate({ id });
      selection.clearSelection();
      cmsToast.info("Azione completata.");
    } catch (error) {
      const mapped = mapTrpcErrorToCmsUiMessage(error);
      cmsToast.error(mapped.description, mapped.title);
    }
  };

  const runBulkAction = async (
    action: "publish" | "unpublish" | "archive" | "feature" | "unfeature" | "delete",
  ) => {
    if (!selection.hasSelection) {
      return;
    }

    const result = await executeBulk(selection.selectedIds, async (id) => {
      if (action === "publish") return publishMutation.mutateAsync({ id });
      if (action === "unpublish") return unpublishMutation.mutateAsync({ id });
      if (action === "archive") return archiveMutation.mutateAsync({ id });
      if (action === "feature") return featureMutation.mutateAsync({ id });
      if (action === "unfeature") return unfeatureMutation.mutateAsync({ id });
      return deleteMutation.mutateAsync({ id });
    });

    await trpcUtils.articles.list.invalidate();
    selection.clearSelection();

    if (result.failed === 0) {
      cmsToast.info(`Azione completata su ${result.success} record.`);
      return;
    }

    cmsToast.error(
      `Completato: ${result.success}, falliti: ${result.failed}.`,
      "Esecuzione parziale",
    );
  };

  return (
    <div className="space-y-6">
      <CmsPageHeader
        title={text.navigation.articles}
        subtitle="Filtri avanzati, ricerca, ordinamento e paginazione integrati via tRPC."
      />

      <CmsDataTableShell
        toolbar={
          <div className="space-y-3">
            <CmsBulkActionBar
              selectedCount={selection.selectedCount}
              actions={[
                {
                  id: "bulk-publish",
                  label: "Publish",
                  disabled: isActionPending,
                  onExecute: () => {
                    void runBulkAction("publish");
                  },
                },
                {
                  id: "bulk-unpublish",
                  label: "Unpublish",
                  disabled: isActionPending,
                  onExecute: () => {
                    void runBulkAction("unpublish");
                  },
                },
                {
                  id: "bulk-feature",
                  label: "Feature",
                  disabled: isActionPending,
                  onExecute: () => {
                    void runBulkAction("feature");
                  },
                },
                {
                  id: "bulk-unfeature",
                  label: "Unfeature",
                  disabled: isActionPending,
                  onExecute: () => {
                    void runBulkAction("unfeature");
                  },
                },
                {
                  id: "bulk-archive",
                  label: "Archive",
                  disabled: isActionPending,
                  onExecute: () => {
                    void runBulkAction("archive");
                  },
                },
                {
                  id: "bulk-delete",
                  label: "Delete",
                  tone: "danger",
                  disabled: isActionPending,
                  requiresConfirm: true,
                  confirmTitle: "Conferma eliminazione",
                  confirmDescription: "Eliminerai definitivamente gli articoli selezionati.",
                  onExecute: () => {
                    void runBulkAction("delete");
                  },
                },
              ]}
            />

            <div className="grid gap-3 lg:grid-cols-4">
              <CmsTextInput
                placeholder={text.listToolbar.searchPlaceholder}
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
              />

              <CmsSelect
                value={input.query?.status ?? "all"}
                onValueChange={(value) => {
                  updateSearchParams({ status: value === "all" ? undefined : value, page: 1 });
                }}
                options={[
                  { value: "all", label: "Stato: tutti" },
                  { value: "DRAFT", label: "Bozza" },
                  { value: "PUBLISHED", label: "Pubblicato" },
                  { value: "ARCHIVED", label: "Archiviato" },
                ]}
              />

              <CmsSelect
                value={input.query?.featured ?? "all"}
                onValueChange={(value) => {
                  updateSearchParams({ featured: value === "all" ? undefined : value, page: 1 });
                }}
                options={[
                  { value: "all", label: "Featured: tutti" },
                  { value: "true", label: "Solo featured" },
                  { value: "false", label: "Solo non featured" },
                ]}
              />

              <CmsSelect
                value={input.query?.issueId ?? "all"}
                onValueChange={(value) => {
                  updateSearchParams({ issueId: value === "all" ? undefined : value, page: 1 });
                }}
                options={issueOptions}
              />
            </div>

            <div className="grid gap-3 lg:grid-cols-4">
              <CmsSelect
                value={input.query?.categoryId ?? "all"}
                onValueChange={(value) => {
                  updateSearchParams({ categoryId: value === "all" ? undefined : value, page: 1 });
                }}
                options={categoryOptions}
              />

              <CmsTextInput
                value={input.query?.authorId ?? ""}
                onChange={(event) => {
                  updateSearchParams({ authorId: event.target.value || undefined, page: 1 });
                }}
                placeholder="Author ID (uuid)"
              />

              <CmsSelect
                value={input.query?.sortBy ?? "createdAt"}
                onValueChange={(value) => {
                  updateSearchParams({ sortBy: value, page: 1 });
                }}
                options={[
                  { value: "createdAt", label: "Sort: creazione" },
                  { value: "publishedAt", label: "Sort: pubblicazione" },
                  { value: "position", label: "Sort: posizione" },
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

            <CmsMetaText variant="tiny" className="block">
              Contratto lista: `status`, `issueId`, `categoryId`, `authorId`, `featured`, `q`,
              `sortBy`, `sortOrder`, `page`, `pageSize`.
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
                        selection.toggleSelectAll(pageArticleIds);
                      }}
                      aria-label="Seleziona tutti"
                    />
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Titolo</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Issue</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Categoria</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Autore</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Stato</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Featured</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Posizione</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Tag</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Pubblicata</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Creata</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQuery.items.map((article) => (
                  <TableRow key={article.id} className={cmsTableClasses.bodyRow}>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      <Checkbox
                        checked={selection.isSelected(article.id)}
                        onCheckedChange={() => {
                          selection.toggleSelection(article.id);
                        }}
                        aria-label={`Seleziona ${article.title}`}
                      />
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellTitle}>{article.title}</TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {article.issueTitle ?? article.issueId}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {article.categoryName ?? article.categoryId}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {article.authorName ?? article.authorEmail ?? article.authorId}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>{article.status}</TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {article.isFeatured ? "Si" : "No"}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {String(article.position)}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {String(article.tagsCount)}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {formatDate(article.publishedAt)}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {formatDate(article.createdAt)}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {article.status !== "PUBLISHED" ? (
                          <CmsActionButton
                            variant="outline"
                            size="xs"
                            disabled={isActionPending}
                            onClick={() => {
                              void runSingleAction("publish", article.id);
                            }}
                          >
                            Publish
                          </CmsActionButton>
                        ) : (
                          <CmsActionButton
                            variant="outline"
                            size="xs"
                            disabled={isActionPending}
                            onClick={() => {
                              void runSingleAction("unpublish", article.id);
                            }}
                          >
                            Unpublish
                          </CmsActionButton>
                        )}

                        {article.isFeatured ? (
                          <CmsActionButton
                            variant="outline"
                            size="xs"
                            disabled={isActionPending}
                            onClick={() => {
                              void runSingleAction("unfeature", article.id);
                            }}
                          >
                            Unfeature
                          </CmsActionButton>
                        ) : (
                          <CmsActionButton
                            variant="outline"
                            size="xs"
                            disabled={isActionPending}
                            onClick={() => {
                              void runSingleAction("feature", article.id);
                            }}
                          >
                            Feature
                          </CmsActionButton>
                        )}

                        <CmsActionButton
                          variant="outline"
                          size="xs"
                          disabled={isActionPending}
                          onClick={() => {
                            void runSingleAction("archive", article.id);
                          }}
                        >
                          Archive
                        </CmsActionButton>

                        <CmsActionButton
                          variant="primary-accent"
                          size="xs"
                          disabled={isActionPending}
                          onClick={() => {
                            void runSingleAction("delete", article.id);
                          }}
                        >
                          Delete
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
                eyebrow="Articoli"
                title={text.resource.emptyTitle(text.navigation.articles)}
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
