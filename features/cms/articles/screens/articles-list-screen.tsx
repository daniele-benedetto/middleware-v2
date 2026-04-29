"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";

import {
  CmsBulkActionBar,
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
  cmsOptionsQueryOptions,
  useArticlesListQuery,
  useCmsListUrlState,
  useListSelection,
  useReorderMode,
} from "@/features/cms/shared/hooks";
import {
  articleAuthorOptionsInput,
  articleCategoryOptionsInput,
  articleIssueOptionsInput,
} from "@/lib/cms/article-options";
import { cmsCrudRoutes } from "@/lib/cms/crud-routes";
import { parseArticlesListSearchParams } from "@/lib/cms/query";
import {
  invalidateAfterCmsMutation,
  mapTrpcErrorToCmsUiMessage,
  type CmsUiError,
} from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc/react";

import type {
  ArticlesListInitialData,
  CategoriesListInitialData,
  IssuesListInitialData,
  UsersAuthorOptionsInitialData,
} from "@/features/cms/shared/types/initial-data";
import type { RouterInputs } from "@/lib/trpc/types";

type ArticlesListInput = RouterInputs["articles"]["list"];

const CmsConfirmDialog = dynamic(
  () => import("@/components/cms/common/confirm-dialog").then((mod) => mod.CmsConfirmDialog),
  { ssr: false },
);

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("it-IT");
}

type ArticleQuickAction = "publish" | "unpublish" | "archive" | "feature" | "unfeature" | "delete";
type ArticleOptimisticAction = Extract<
  ArticleQuickAction,
  "publish" | "unpublish" | "feature" | "unfeature"
>;

type ArticleSingleActionContext = {
  selectedCount: number;
  isPending: boolean;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isFeatured: boolean;
};

const articleSingleActionConfig: CmsQuickAction<ArticleSingleActionContext>[] = [
  {
    id: "publish",
    label: i18n.cms.quickActions.publish,
    scope: "single",
    isVisible: (context) => context.status !== "PUBLISHED",
    isEnabled: (context) => !context.isPending,
  },
  {
    id: "unpublish",
    label: i18n.cms.quickActions.unpublish,
    scope: "single",
    isVisible: (context) => context.status === "PUBLISHED",
    isEnabled: (context) => !context.isPending,
  },
  {
    id: "feature",
    label: i18n.cms.quickActions.feature,
    scope: "single",
    isVisible: (context) => !context.isFeatured,
    isEnabled: (context) => !context.isPending,
  },
  {
    id: "unfeature",
    label: i18n.cms.quickActions.unfeature,
    scope: "single",
    isVisible: (context) => context.isFeatured,
    isEnabled: (context) => !context.isPending,
  },
  {
    id: "archive",
    label: i18n.cms.quickActions.archive,
    scope: "single",
    isVisible: (context) => context.status !== "ARCHIVED",
    isEnabled: (context) => !context.isPending,
  },
  {
    id: "delete",
    label: i18n.cms.quickActions.delete,
    scope: "single",
    tone: "danger",
    requiresConfirm: true,
    confirm: {
      title: i18n.cms.quickActions.confirmDeleteTitle,
      description: i18n.cms.quickActions.confirmDeleteSingleArticle,
    },
    isEnabled: (context) => !context.isPending,
  },
];

function isOptimisticArticleAction(action: ArticleQuickAction): action is ArticleOptimisticAction {
  return (
    action === "publish" || action === "unpublish" || action === "feature" || action === "unfeature"
  );
}

function patchArticleForOptimisticAction<
  TArticle extends {
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    publishedAt: string | null;
    isFeatured: boolean;
  },
>(action: ArticleOptimisticAction, article: TArticle): TArticle {
  if (action === "publish") {
    return {
      ...article,
      status: "PUBLISHED" as const,
      publishedAt: article.publishedAt ?? new Date().toISOString(),
    };
  }

  if (action === "unpublish") {
    return {
      ...article,
      status: "DRAFT" as const,
      publishedAt: null,
    };
  }

  if (action === "feature") {
    return {
      ...article,
      isFeatured: true,
    };
  }

  return {
    ...article,
    isFeatured: false,
  };
}

function mapArticleDomainError(uiError: CmsUiError): CmsUiError {
  const text = i18n.cms.lists.articles.domainErrors;

  if (uiError.code === "CONFLICT") {
    return {
      ...uiError,
      title: text.slugConflictTitle,
      description: text.slugConflictDescription,
    };
  }

  if (uiError.code === "BAD_REQUEST") {
    return {
      ...uiError,
      title: text.invalidPayloadTitle,
    };
  }

  if (uiError.code === "TOO_MANY_REQUESTS") {
    return {
      ...uiError,
      title: text.rateLimitTitle,
      description: text.rateLimitDescription,
      retryable: true,
    };
  }

  return uiError;
}

type CmsArticlesListScreenProps = {
  initialInput?: ArticlesListInput;
  initialData?: ArticlesListInitialData;
  initialIssuesOptionsData?: IssuesListInitialData;
  initialCategoriesOptionsData?: CategoriesListInitialData;
  initialAuthorsOptionsData?: UsersAuthorOptionsInitialData;
};

export function CmsArticlesListScreen({
  initialInput,
  initialData,
  initialIssuesOptionsData,
  initialCategoriesOptionsData,
  initialAuthorsOptionsData,
}: CmsArticlesListScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const text = i18n.cms;
  const listText = text.lists.articles;
  const commonText = text.common;
  const quickText = text.quickActions;
  const optionsText = text.listOptions;

  const input = parseArticlesListSearchParams(searchParams);
  const listQuery = useArticlesListQuery(input, {
    initialDataInput: initialInput,
    initialData,
  });
  const trpcUtils = trpc.useUtils();

  const selection = useListSelection();

  const navigateToCrudRoute = (href: string) => {
    router.push(href);
  };

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

  const issuesOptionsQuery = trpc.issues.list.useQuery(articleIssueOptionsInput, {
    ...cmsOptionsQueryOptions,
    initialData: initialIssuesOptionsData,
  });

  const categoriesOptionsQuery = trpc.categories.list.useQuery(articleCategoryOptionsInput, {
    ...cmsOptionsQueryOptions,
    initialData: initialCategoriesOptionsData,
  });

  const authorsOptionsQuery = trpc.users.listAuthors.useQuery(articleAuthorOptionsInput, {
    ...cmsOptionsQueryOptions,
    initialData: initialAuthorsOptionsData,
  });

  const issueOptions = useMemo(() => {
    const items = issuesOptionsQuery.data?.items ?? [];
    return [
      { value: "all", label: optionsText.issueAll },
      ...items.map((issue) => ({ value: issue.id, label: issue.title })),
    ];
  }, [issuesOptionsQuery.data?.items, optionsText.issueAll]);

  const categoryOptions = useMemo(() => {
    const items = categoriesOptionsQuery.data?.items ?? [];
    return [
      { value: "all", label: optionsText.categoryAll },
      ...items.map((category) => ({ value: category.id, label: category.name })),
    ];
  }, [categoriesOptionsQuery.data?.items, optionsText.categoryAll]);

  const authorOptions = useMemo(() => {
    const items = authorsOptionsQuery.data?.items ?? [];
    return [
      { value: "all", label: optionsText.authorAll },
      ...items.map((author) => ({
        value: author.id,
        label: author.name ? `${author.name} (${author.email})` : author.email,
      })),
    ];
  }, [authorsOptionsQuery.data?.items, optionsText.authorAll]);

  const { updateSearchParams } = useCmsListUrlState({
    baseParams: {
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
    },
    clearSelection: selection.clearSelection,
  });

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

  const applyOptimisticArticleUpdates = (
    action: ArticleOptimisticAction,
    ids: string[],
  ): (() => void) => {
    const previousList = trpcUtils.articles.list.getData(input);

    trpcUtils.articles.list.setData(input, (current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        items: current.items.map((item) => {
          if (!ids.includes(item.id)) {
            return item;
          }

          return patchArticleForOptimisticAction(action, item);
        }),
      };
    });

    return () => {
      trpcUtils.articles.list.setData(input, previousList);
    };
  };

  const runSingleAction = async (action: ArticleQuickAction, id: string) => {
    const rollbackOptimistic = isOptimisticArticleAction(action)
      ? applyOptimisticArticleUpdates(action, [id])
      : undefined;

    try {
      await runMutationByAction(action, id);
      await invalidateAfterCmsMutation(trpcUtils, mutationNameByAction[action], { id });
      selection.clearSelection();
      cmsToast.info(commonText.actionCompleted);
    } catch (error) {
      rollbackOptimistic?.();

      const mapped = mapArticleDomainError(mapQuickActionError(error));
      cmsToast.error(mapped.description, mapped.title);
    }
  };

  const runBulkAction = async (action: ArticleQuickAction) => {
    if (!selection.hasSelection) {
      return;
    }

    const selectedIds = [...selection.selectedIds];
    const rollbackOptimistic = isOptimisticArticleAction(action)
      ? applyOptimisticArticleUpdates(action, selectedIds)
      : undefined;

    const result = await executeBulk(selectedIds, (id) => runMutationByAction(action, id));

    if (result.failed > 0) {
      rollbackOptimistic?.();
    }

    await invalidateAfterCmsMutation(trpcUtils, mutationNameByAction[action], {
      ids: selectedIds,
    });
    selection.clearSelection();

    if (result.failed === 0) {
      cmsToast.info(commonText.actionCompletedOnRecords(result.success));
      return;
    }

    const mappedError = mapBulkQuickActionError(result);

    if (mappedError) {
      const domainError = mapArticleDomainError(mappedError);
      cmsToast.error(domainError.description, domainError.title);
    }
  };

  const saveArticleOrder = async () => {
    const issueId = input.query?.issueId;

    if (!issueId) {
      return;
    }

    if (!reorder.hasChanges) {
      reorder.cancel();
      return;
    }

    try {
      const reorderedItems = await reorderMutation.mutateAsync({
        issueId,
        orderedArticleIds: reorder.normalizedOrder,
      });

      trpcUtils.articles.list.setData(input, (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          items: reorderedItems,
        };
      });

      reorder.commit();
      await invalidateAfterCmsMutation(trpcUtils, "articles.reorder", {
        ids: reorder.normalizedOrder,
      });
      cmsToast.info(listText.reorderUpdated);
    } catch (error) {
      const mapped = mapArticleDomainError(mapQuickActionError(error));
      cmsToast.error(mapped.description, mapped.title);
    }
  };

  const bulkActionConfig: CmsQuickAction[] = [
    {
      id: "bulk-publish",
      label: quickText.publish,
      scope: "bulk",
      isEnabled: ({ selectedCount, isPending }) => selectedCount > 0 && !isPending,
    },
    {
      id: "bulk-unpublish",
      label: quickText.unpublish,
      scope: "bulk",
      isEnabled: ({ selectedCount, isPending }) => selectedCount > 0 && !isPending,
    },
    {
      id: "bulk-feature",
      label: quickText.feature,
      scope: "bulk",
      isEnabled: ({ selectedCount, isPending }) => selectedCount > 0 && !isPending,
    },
    {
      id: "bulk-unfeature",
      label: quickText.unfeature,
      scope: "bulk",
      isEnabled: ({ selectedCount, isPending }) => selectedCount > 0 && !isPending,
    },
    {
      id: "bulk-archive",
      label: quickText.archive,
      scope: "bulk",
      isEnabled: ({ selectedCount, isPending }) => selectedCount > 0 && !isPending,
    },
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
            ? quickText.confirmDeleteArticleSingle
            : quickText.confirmDeleteArticleBulk(selectedCount),
      }),
      isEnabled: ({ selectedCount, isPending }) => selectedCount > 0 && !isPending,
    },
  ];

  const resolvedBulkActions = resolveQuickActions(bulkActionConfig, {
    selectedCount: selection.selectedCount,
    isPending: isActionPending || reorder.isReorderMode,
  });

  const hasActiveFilters = Boolean(
    input.query?.q ||
    input.query?.status !== undefined ||
    input.query?.issueId !== undefined ||
    input.query?.categoryId !== undefined ||
    input.query?.authorId !== undefined ||
    input.query?.featured !== undefined,
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CmsPageHeader
        title={text.navigation.articles}
        actions={
          <div className="flex items-center gap-2">
            {canReorder ? (
              reorder.isReorderMode ? (
                <>
                  <CmsActionButton
                    size="xs"
                    variant="outline"
                    onClick={reorder.cancel}
                    disabled={reorderMutation.isPending}
                  >
                    {commonText.cancel}
                  </CmsActionButton>
                  <CmsActionButton
                    size="xs"
                    variant="outline"
                    onClick={() => {
                      void saveArticleOrder();
                    }}
                    disabled={!reorder.hasChanges || reorderMutation.isPending}
                  >
                    {commonText.saveOrder}
                  </CmsActionButton>
                </>
              ) : (
                <CmsActionButton
                  size="xs"
                  variant="outline"
                  onClick={() => {
                    selection.clearSelection();
                    reorder.start();
                  }}
                >
                  {commonText.reorderMode}
                </CmsActionButton>
              )
            ) : null}
            <CmsActionButton
              size="xs"
              variant="outline"
              onClick={() => navigateToCrudRoute(cmsCrudRoutes.articles.create)}
            >
              {text.resource.new}
            </CmsActionButton>
          </div>
        }
      />

      <CmsDataTableShell
        toolbar={
          <div className="space-y-3">
            <div className="font-ui text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
              {commonText.totalRecords(listQuery.pagination.total)}
            </div>
            {reorder.isReorderMode ? (
              <div className="border border-accent px-3 py-2 font-ui text-[11px] uppercase tracking-[0.04em] text-accent">
                {listText.reorderHelp}
              </div>
            ) : null}
            <CmsBulkActionBar
              selectedCount={selection.selectedCount}
              actions={resolvedBulkActions.map((action) => ({
                ...action,
                onExecute: () => {
                  const bulkAction = action.id.replace("bulk-", "") as ArticleQuickAction;
                  void runBulkAction(bulkAction);
                },
              }))}
              onSelectAll={
                pageArticleIds.length > 0 && !allSelectedOnPage
                  ? () => selection.setSelection(pageArticleIds)
                  : undefined
              }
              selectAllDisabled={isActionPending || reorder.isReorderMode}
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
                  value={input.query?.status ?? "all"}
                  onValueChange={(value) => {
                    updateSearchParams({ status: value === "all" ? undefined : value, page: 1 });
                  }}
                  options={[
                    { value: "all", label: optionsText.statusAllMasculine },
                    { value: "DRAFT", label: listText.statusDraft },
                    { value: "PUBLISHED", label: listText.statusPublished },
                    { value: "ARCHIVED", label: listText.statusArchived },
                  ]}
                />

                <CmsSelect
                  value={input.query?.featured ?? "all"}
                  onValueChange={(value) => {
                    updateSearchParams({ featured: value === "all" ? undefined : value, page: 1 });
                  }}
                  options={[
                    { value: "all", label: optionsText.featuredAll },
                    { value: "true", label: optionsText.featuredOnly },
                    { value: "false", label: optionsText.notFeaturedOnly },
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
            </div>

            <div className="grid gap-3 lg:grid-cols-4">
              <CmsSelect
                value={input.query?.categoryId ?? "all"}
                onValueChange={(value) => {
                  updateSearchParams({ categoryId: value === "all" ? undefined : value, page: 1 });
                }}
                options={categoryOptions}
              />

              <CmsSelect
                value={input.query?.authorId ?? "all"}
                onValueChange={(value) => {
                  updateSearchParams({ authorId: value === "all" ? undefined : value, page: 1 });
                }}
                options={authorOptions}
              />

              <CmsSelect
                value={input.query?.sortBy ?? "createdAt"}
                onValueChange={(value) => {
                  updateSearchParams({ sortBy: value, page: 1 });
                }}
                options={[
                  { value: "createdAt", label: optionsText.sortCreatedAt },
                  { value: "publishedAt", label: optionsText.sortPublishedAt },
                  { value: "position", label: optionsText.sortPosition },
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
                      className={cmsTableClasses.headerCheckbox}
                      aria-label={commonText.selectAll}
                    />
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.title}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.issue}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.category}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.author}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.status}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.featured}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.position}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.tags}
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
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.reorder}
                  </TableHead>
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
                        aria-label={listText.selectItem(article.title)}
                      />
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellTitle}>{article.title}</TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {article.issueTitle ?? "-"}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {article.categoryName ?? "-"}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {article.authorName ?? article.authorEmail ?? "-"}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>{article.status}</TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {article.isFeatured ? commonText.yes : commonText.no}
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
                      <div className="flex items-center gap-1.5">
                        <CmsActionButton
                          variant="outline"
                          size="xs"
                          disabled={isActionPending || reorder.isReorderMode}
                          onClick={() =>
                            navigateToCrudRoute(cmsCrudRoutes.articles.edit(article.id))
                          }
                        >
                          {quickText.edit}
                        </CmsActionButton>
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
                title={text.resource.emptyTitle(text.navigation.articles)}
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
