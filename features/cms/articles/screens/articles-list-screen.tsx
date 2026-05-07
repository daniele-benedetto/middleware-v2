"use client";

import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import {
  CmsEmptyState,
  CmsErrorState,
  CmsLoadingState,
  CmsPaginationFooter,
} from "@/components/cms/common";
import {
  CmsActionButton,
  CmsDataTableShell,
  CmsPageHeader,
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
import { ArticlesListToolbar } from "@/features/cms/articles/components/articles-list-toolbar";
import {
  executeBulk,
  mapBulkQuickActionError,
  mapQuickActionError,
  resolveQuickActions,
  type CmsQuickAction,
} from "@/features/cms/shared/actions";
import {
  cmsOptionsQueryOptions,
  useArticlesListQuery,
  useCmsListUrlState,
  useDragReorder,
  useListSelection,
  useSortableSensors,
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
import { cn } from "@/lib/utils";

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

  if (uiError.reason) {
    return uiError;
  }

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

type ArticleTableRow = {
  id: string;
  title: string;
  issueTitle: string | null;
  categoryName: string | null;
  authorName: string | null;
  authorEmail: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isFeatured: boolean;
  tagsCount: number;
  publishedAt: string | null;
  createdAt: string;
};

function stopRowReorder(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

type SortableArticleRowProps = {
  article: ArticleTableRow;
  canReorder: boolean;
  isPending: boolean;
  isSelected: boolean;
  onToggleSelection: (id: string) => void;
  onEdit: (id: string) => void;
  onRunAction: (action: ArticleQuickAction, id: string) => void;
  selectLabel: string;
  editLabel: string;
  yesLabel: string;
  noLabel: string;
};

function SortableArticleRow({
  article,
  canReorder,
  isPending,
  isSelected,
  onToggleSelection,
  onEdit,
  onRunAction,
  selectLabel,
  editLabel,
  yesLabel,
  noLabel,
}: SortableArticleRowProps) {
  const isDragEnabled = canReorder && !isPending;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: article.id,
    disabled: !isDragEnabled,
  });

  const rowTransform = transform ? { ...transform, x: 0, scaleX: 1, scaleY: 1 } : null;

  return (
    <TableRow
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(rowTransform), transition }}
      className={cn(
        cmsTableClasses.bodyRow,
        isDragEnabled && "cursor-grab select-none touch-manipulation active:cursor-grabbing",
        isDragging && "relative z-10 bg-white shadow-[0_0_0_2px_var(--color-accent)]",
      )}
      {...(isDragEnabled ? attributes : {})}
      {...(isDragEnabled ? listeners : {})}
    >
      <TableCell className={cn(cmsTableClasses.bodyCellMeta, cmsTableClasses.selectionCell)}>
        <div className={cmsTableClasses.selectionCellInner} onPointerDownCapture={stopRowReorder}>
          <Checkbox
            checked={isSelected}
            disabled={isPending}
            onCheckedChange={() => {
              onToggleSelection(article.id);
            }}
            aria-label={selectLabel}
          />
        </div>
      </TableCell>
      <TableCell className={cmsTableClasses.bodyCellTitle}>{article.title}</TableCell>
      <TableCell className={cmsTableClasses.bodyCellMeta}>{article.issueTitle ?? "-"}</TableCell>
      <TableCell className={cmsTableClasses.bodyCellMeta}>{article.categoryName ?? "-"}</TableCell>
      <TableCell className={cmsTableClasses.bodyCellMeta}>
        {article.authorName ?? article.authorEmail ?? "-"}
      </TableCell>
      <TableCell className={cmsTableClasses.bodyCellMeta}>{article.status}</TableCell>
      <TableCell className={cmsTableClasses.bodyCellMeta}>
        {article.isFeatured ? yesLabel : noLabel}
      </TableCell>
      <TableCell className={cmsTableClasses.bodyCellMeta}>{String(article.tagsCount)}</TableCell>
      <TableCell className={cmsTableClasses.bodyCellMeta}>
        {formatDate(article.publishedAt)}
      </TableCell>
      <TableCell className={cmsTableClasses.bodyCellMeta}>
        {formatDate(article.createdAt)}
      </TableCell>
      <TableCell className={cmsTableClasses.bodyCellMeta}>
        <div className="flex items-center gap-1.5" onPointerDownCapture={stopRowReorder}>
          <CmsActionButton
            variant="outline"
            size="xs"
            disabled={isPending}
            onClick={() => onEdit(article.id)}
          >
            {editLabel}
          </CmsActionButton>
          {resolveQuickActions(articleSingleActionConfig, {
            selectedCount: 1,
            isPending,
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
                onConfirm={() => onRunAction(action.id as ArticleQuickAction, article.id)}
              />
            ) : (
              <CmsActionButton
                key={`${article.id}-${action.id}`}
                variant={action.tone === "danger" ? "primary-accent" : "outline"}
                size="xs"
                disabled={action.disabled}
                onClick={() => {
                  onRunAction(action.id as ArticleQuickAction, article.id);
                }}
              >
                {action.label}
              </CmsActionButton>
            ),
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

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
  const fieldText = text.forms.fields;

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
      ...items.map((category) => ({
        value: category.id,
        label: category.name,
        displayLabel: `${fieldText.category}: ${category.name}`,
      })),
    ];
  }, [categoriesOptionsQuery.data?.items, fieldText.category, optionsText.categoryAll]);

  const authorOptions = useMemo(() => {
    const items = authorsOptionsQuery.data?.items ?? [];
    return [
      { value: "all", label: optionsText.authorAll },
      ...items.map((author) => ({
        value: author.id,
        label: author.name ? `${author.name} (${author.email})` : author.email,
        displayLabel: `${fieldText.author}: ${author.name ?? author.email}`,
      })),
    ];
  }, [authorsOptionsQuery.data?.items, fieldText.author, optionsText.authorAll]);

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

  const reorder = useDragReorder(listQuery.items);
  const sortableSensors = useSortableSensors();

  const displayedArticles = canReorder ? reorder.displayedItems : listQuery.items;

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

  const persistArticleOrder = async (issueId: string, nextOrder: string[]) => {
    try {
      const reorderedItems = await reorderMutation.mutateAsync({
        issueId,
        orderedArticleIds: nextOrder,
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

      reorder.sync(reorderedItems.map((item) => item.id));
      await invalidateAfterCmsMutation(trpcUtils, "articles.reorder", {
        ids: nextOrder,
      });
      cmsToast.info(listText.reorderUpdated);
    } catch (error) {
      reorder.reset();
      const mapped = mapArticleDomainError(mapQuickActionError(error));
      cmsToast.error(mapped.description, mapped.title);
    }
  };

  const handleArticleDrop = async (activeId: string, overId: string) => {
    const issueId = input.query?.issueId;

    if (!issueId) {
      return;
    }

    const activeIndex = reorder.orderedIds.indexOf(activeId);
    const overIndex = reorder.orderedIds.indexOf(overId);

    if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) {
      return;
    }

    const nextOrder = arrayMove(reorder.orderedIds, activeIndex, overIndex);

    reorder.sync(nextOrder);
    await persistArticleOrder(issueId, nextOrder);
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
    isPending: isActionPending,
  });

  const toolbarBulkActions = resolvedBulkActions.map((action) => ({
    ...action,
    onExecute: () => {
      const bulkAction = action.id.replace("bulk-", "") as ArticleQuickAction;
      return runBulkAction(bulkAction);
    },
  }));

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
            <CmsActionButton
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
          <ArticlesListToolbar
            totalRecords={listQuery.pagination.total}
            selectedCount={selection.selectedCount}
            bulkActions={toolbarBulkActions}
            onSelectAll={
              pageArticleIds.length > 0 && !allSelectedOnPage
                ? () => selection.setSelection(pageArticleIds)
                : undefined
            }
            selectAllDisabled={isActionPending}
            searchValue={input.query?.q ?? ""}
            statusValue={input.query?.status ?? "all"}
            featuredValue={input.query?.featured ?? "all"}
            issueIdValue={input.query?.issueId ?? "all"}
            categoryIdValue={input.query?.categoryId ?? "all"}
            authorIdValue={input.query?.authorId ?? "all"}
            sortByValue={input.query?.sortBy ?? "createdAt"}
            sortOrderValue={input.query?.sortOrder ?? "desc"}
            issueOptions={issueOptions}
            categoryOptions={categoryOptions}
            authorOptions={authorOptions}
            issuesLoading={issuesOptionsQuery.isPending}
            categoriesLoading={categoriesOptionsQuery.isPending}
            authorsLoading={authorsOptionsQuery.isPending}
            onSearchChange={(value) => {
              updateSearchParams({ q: value, page: 1 });
            }}
            onStatusChange={(value) => {
              updateSearchParams({ status: value === "all" ? undefined : value, page: 1 });
            }}
            onFeaturedChange={(value) => {
              updateSearchParams({ featured: value === "all" ? undefined : value, page: 1 });
            }}
            onIssueChange={(value) => {
              updateSearchParams({ issueId: value === "all" ? undefined : value, page: 1 });
            }}
            onCategoryChange={(value) => {
              updateSearchParams({ categoryId: value === "all" ? undefined : value, page: 1 });
            }}
            onAuthorChange={(value) => {
              updateSearchParams({ authorId: value === "all" ? undefined : value, page: 1 });
            }}
            onSortByChange={(value) => {
              updateSearchParams({ sortBy: value, page: 1 });
            }}
            onSortOrderChange={(value) => {
              updateSearchParams({ sortOrder: value, page: 1 });
            }}
          />
        }
        table={
          displayedArticles.length > 0 ? (
            <DndContext
              id="cms-articles-list-dnd"
              sensors={sortableSensors}
              collisionDetection={closestCenter}
              onDragEnd={({ active, over }) => {
                if (!canReorder || reorderMutation.isPending || !over) {
                  return;
                }

                void handleArticleDrop(String(active.id), String(over.id));
              }}
            >
              <Table className={cmsTableClasses.table}>
                <TableHeader>
                  <TableRow className={cmsTableClasses.headerRow}>
                    <TableHead
                      className={cn(cmsTableClasses.headerCell, cmsTableClasses.selectionCell)}
                    >
                      <div
                        className={cmsTableClasses.selectionCellInner}
                        onPointerDownCapture={stopRowReorder}
                      >
                        <Checkbox
                          checked={allSelectedOnPage}
                          disabled={isActionPending}
                          onCheckedChange={() => {
                            selection.toggleSelectAll(pageArticleIds);
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <SortableContext
                    items={displayedArticles.map((article) => article.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {displayedArticles.map((article) => (
                      <SortableArticleRow
                        key={article.id}
                        article={article}
                        canReorder={canReorder}
                        isPending={isActionPending}
                        isSelected={selection.isSelected(article.id)}
                        onToggleSelection={selection.toggleSelection}
                        onEdit={(id) => navigateToCrudRoute(cmsCrudRoutes.articles.edit(id))}
                        onRunAction={(action, id) => {
                          void runSingleAction(action, id);
                        }}
                        selectLabel={listText.selectItem(article.title)}
                        editLabel={quickText.edit}
                        yesLabel={commonText.yes}
                        noLabel={commonText.no}
                      />
                    ))}
                  </SortableContext>
                </TableBody>
              </Table>
            </DndContext>
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
