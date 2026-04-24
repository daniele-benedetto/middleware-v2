"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

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
import {
  executeBulk,
  mapBulkQuickActionError,
  mapQuickActionError,
  resolveQuickActions,
  type CmsQuickAction,
} from "@/features/cms/shared/actions";
import {
  useArticlesListQuery,
  useListSelection,
  useReorderMode,
} from "@/features/cms/shared/hooks";
import { parseArticlesListSearchParams, serializeCmsSearchParams } from "@/lib/cms/query";
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

type ArticleQuickAction = "publish" | "unpublish" | "archive" | "feature" | "unfeature" | "delete";

type ArticleSingleActionContext = {
  selectedCount: number;
  isPending: boolean;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isFeatured: boolean;
};

const articleSingleActionConfig: CmsQuickAction<ArticleSingleActionContext>[] = [
  {
    id: "publish",
    label: "Publish",
    scope: "single",
    isVisible: (context) => context.status !== "PUBLISHED",
    isEnabled: (context) => !context.isPending,
  },
  {
    id: "unpublish",
    label: "Unpublish",
    scope: "single",
    isVisible: (context) => context.status === "PUBLISHED",
    isEnabled: (context) => !context.isPending,
  },
  {
    id: "feature",
    label: "Feature",
    scope: "single",
    isVisible: (context) => !context.isFeatured,
    isEnabled: (context) => !context.isPending,
  },
  {
    id: "unfeature",
    label: "Unfeature",
    scope: "single",
    isVisible: (context) => context.isFeatured,
    isEnabled: (context) => !context.isPending,
  },
  {
    id: "archive",
    label: "Archive",
    scope: "single",
    isVisible: (context) => context.status !== "ARCHIVED",
    isEnabled: (context) => !context.isPending,
  },
  {
    id: "delete",
    label: "Delete",
    scope: "single",
    tone: "danger",
    requiresConfirm: true,
    confirm: {
      title: "Conferma eliminazione",
      description: "Eliminerai definitivamente questo articolo.",
    },
    isEnabled: (context) => !context.isPending,
  },
];

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
  const reorderMutation = trpc.articles.reorder.useMutation();

  const isActionPending =
    publishMutation.isPending ||
    unpublishMutation.isPending ||
    archiveMutation.isPending ||
    featureMutation.isPending ||
    unfeatureMutation.isPending ||
    deleteMutation.isPending ||
    reorderMutation.isPending;

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

  const canReorder =
    input.query?.sortBy === "position" &&
    input.query.sortOrder === "asc" &&
    Boolean(input.query.issueId) &&
    !input.query.q &&
    input.query.status === undefined &&
    input.query.categoryId === undefined &&
    input.query.authorId === undefined &&
    input.query.featured === undefined &&
    listQuery.pagination.total === listQuery.items.length;

  const reorder = useReorderMode(listQuery.items);

  const displayedArticles = reorder.isReorderMode ? reorder.displayedItems : listQuery.items;

  useEffect(() => {
    if (!canReorder && reorder.isReorderMode) {
      reorder.cancel();
    }
  }, [canReorder, reorder]);

  const reorderUnavailableText =
    "Reorder disponibile con `issueId` valorizzato, `sortBy=position`, `sortOrder=asc`, senza altri filtri e con una sola pagina.";

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

  const pageArticleIds = displayedArticles.map((article) => article.id);
  const allSelectedOnPage =
    pageArticleIds.length > 0 &&
    pageArticleIds.every((articleId) => selection.isSelected(articleId));

  const runMutationByAction = (action: ArticleQuickAction, id: string) => {
    if (action === "publish") {
      return publishMutation.mutateAsync({ id });
    }

    if (action === "unpublish") {
      return unpublishMutation.mutateAsync({ id });
    }

    if (action === "archive") {
      return archiveMutation.mutateAsync({ id });
    }

    if (action === "feature") {
      return featureMutation.mutateAsync({ id });
    }

    if (action === "unfeature") {
      return unfeatureMutation.mutateAsync({ id });
    }

    return deleteMutation.mutateAsync({ id });
  };

  const mutationNameByAction: Record<
    ArticleQuickAction,
    | "articles.publish"
    | "articles.unpublish"
    | "articles.archive"
    | "articles.feature"
    | "articles.unfeature"
    | "articles.delete"
  > = {
    publish: "articles.publish",
    unpublish: "articles.unpublish",
    archive: "articles.archive",
    feature: "articles.feature",
    unfeature: "articles.unfeature",
    delete: "articles.delete",
  };

  const runSingleAction = async (action: ArticleQuickAction, id: string) => {
    try {
      await runMutationByAction(action, id);
      await invalidateAfterCmsMutation(trpcUtils, mutationNameByAction[action], { id });
      selection.clearSelection();
      cmsToast.info("Azione completata.");
    } catch (error) {
      const mapped = mapQuickActionError(error);
      cmsToast.error(mapped.description, mapped.title);
    }
  };

  const runBulkAction = async (action: ArticleQuickAction) => {
    if (!selection.hasSelection) {
      return;
    }

    const result = await executeBulk(selection.selectedIds, (id) =>
      runMutationByAction(action, id),
    );

    await invalidateAfterCmsMutation(trpcUtils, mutationNameByAction[action], {
      ids: selection.selectedIds,
    });
    selection.clearSelection();

    if (result.failed === 0) {
      cmsToast.info(`Azione completata su ${result.success} record.`);
      return;
    }

    const mappedError = mapBulkQuickActionError(result);

    if (mappedError) {
      cmsToast.error(mappedError.description, mappedError.title);
    }
  };

  const bulkActionConfig: CmsQuickAction[] = [
    {
      id: "bulk-publish",
      label: "Publish",
      scope: "bulk",
      isEnabled: ({ selectedCount, isPending }) => selectedCount > 0 && !isPending,
    },
    {
      id: "bulk-unpublish",
      label: "Unpublish",
      scope: "bulk",
      isEnabled: ({ selectedCount, isPending }) => selectedCount > 0 && !isPending,
    },
    {
      id: "bulk-feature",
      label: "Feature",
      scope: "bulk",
      isEnabled: ({ selectedCount, isPending }) => selectedCount > 0 && !isPending,
    },
    {
      id: "bulk-unfeature",
      label: "Unfeature",
      scope: "bulk",
      isEnabled: ({ selectedCount, isPending }) => selectedCount > 0 && !isPending,
    },
    {
      id: "bulk-archive",
      label: "Archive",
      scope: "bulk",
      isEnabled: ({ selectedCount, isPending }) => selectedCount > 0 && !isPending,
    },
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
            ? "Eliminerai definitivamente l'articolo selezionato."
            : `Eliminerai definitivamente ${selectedCount} articoli selezionati.`,
      }),
      isEnabled: ({ selectedCount, isPending }) => selectedCount > 0 && !isPending,
    },
  ];

  const resolvedBulkActions = resolveQuickActions(bulkActionConfig, {
    selectedCount: selection.selectedCount,
    isPending: isActionPending || reorder.isReorderMode,
  });

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
              actions={resolvedBulkActions.map((action) => ({
                ...action,
                onExecute: () => {
                  const bulkAction = action.id.replace("bulk-", "") as ArticleQuickAction;
                  void runBulkAction(bulkAction);
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

            <CmsReorderModeBar
              isAvailable={canReorder}
              isReorderMode={reorder.isReorderMode}
              hasChanges={canReorder && reorder.hasChanges}
              isSaving={reorderMutation.isPending}
              helpText="Modalita reorder attiva: usa le frecce per riordinare gli articoli dell'issue selezionata."
              unavailableText={reorderUnavailableText}
              onStart={() => {
                selection.clearSelection();
                reorder.start();
              }}
              onCancel={reorder.cancel}
              onSave={() => {
                const issueId = input.query?.issueId;

                if (!issueId || !canReorder || !reorder.hasChanges) {
                  return;
                }

                reorderMutation.mutate(
                  {
                    issueId,
                    orderedArticleIds: reorder.normalizedOrder,
                  },
                  {
                    onSuccess: async () => {
                      await invalidateAfterCmsMutation(trpcUtils, "articles.reorder", {
                        ids: reorder.normalizedOrder,
                      });
                      reorder.commit();
                      cmsToast.info("Ordine articoli aggiornato con successo.");
                    },
                    onError: (error) => {
                      const mapped = mapTrpcErrorToCmsUiMessage(error);
                      cmsToast.error(mapped.description, mapped.title);
                    },
                  },
                );
              }}
            />

            <CmsMetaText variant="tiny" className="block">
              Contratto lista: `status`, `issueId`, `categoryId`, `authorId`, `featured`, `q`,
              `sortBy`, `sortOrder`, `page`, `pageSize`.
            </CmsMetaText>
          </div>
        }
        table={
          displayedArticles.length > 0 ? (
            <Table className={cmsTableClasses.table}>
              <TableHeader>
                <TableRow className={cmsTableClasses.headerRow}>
                  <TableHead className={cmsTableClasses.headerCell}>
                    <Checkbox
                      checked={allSelectedOnPage}
                      disabled={reorder.isReorderMode}
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
                  <TableHead className={cmsTableClasses.headerCell}>Reorder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedArticles.map((article, index) => (
                  <TableRow key={article.id} className={cmsTableClasses.bodyRow}>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      <Checkbox
                        checked={selection.isSelected(article.id)}
                        disabled={reorder.isReorderMode}
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
                        {resolveQuickActions(articleSingleActionConfig, {
                          selectedCount: 1,
                          isPending: isActionPending || reorder.isReorderMode,
                          status: article.status,
                          isFeatured: article.isFeatured,
                        }).map((action) =>
                          action.confirm ? (
                            <CmsConfirmDialog
                              key={`${article.id}-${action.id}`}
                              triggerLabel={action.label}
                              triggerDisabled={action.disabled}
                              title={action.confirm.title}
                              description={action.confirm.description}
                              confirmLabel={action.confirm.confirmLabel}
                              cancelLabel={action.confirm.cancelLabel}
                              tone={action.tone === "danger" ? "danger" : "default"}
                              onConfirm={() => {
                                void runSingleAction(action.id as ArticleQuickAction, article.id);
                              }}
                            />
                          ) : (
                            <CmsActionButton
                              key={`${article.id}-${action.id}`}
                              variant={action.tone === "danger" ? "primary-accent" : "outline"}
                              size="xs"
                              disabled={action.disabled}
                              onClick={() => {
                                void runSingleAction(action.id as ArticleQuickAction, article.id);
                              }}
                            >
                              {action.label}
                            </CmsActionButton>
                          ),
                        )}
                      </div>
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
                            index === displayedArticles.length - 1 ||
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
