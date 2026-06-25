"use client";

import {
  DndContext,
  DragOverlay,
  closestCenter,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, Copy, GripVertical, Plus, Trash2 } from "lucide-react";
import { useState, type HTMLAttributes, type ReactNode } from "react";

import {
  CmsActionButton,
  CmsBody,
  CmsFormField,
  CmsMetaText,
  CmsSelect,
  CmsStyledTitleEditor,
  CmsTextarea,
  createStyledTitleValue,
  getStyledTitlePlainText,
  hasStyledTitleAccent,
} from "@/components/cms/primitives";
import { useSortableSensors } from "@/features/cms/shared/hooks/use-sortable-sensors";
import {
  createEmptyHomeBlock,
  isEditorialSingleBlock,
  isSingleArticleBlock,
  normalizeHomeBlock,
  reorderItems,
} from "@/lib/issues/home-block-rules";
import { cn } from "@/lib/utils";

import type {
  IssueHomeBlock,
  IssueHomeBlocks,
  IssueTitleStyled,
} from "@/lib/server/modules/issues/schema";

type IssueHomeBlockArticle = {
  id: string;
  title: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isFeatured: boolean;
  categoryName?: string | null;
  categorySlug?: string | null;
};

type IssueHomeBlocksEditorText = {
  addBlock: string;
  articleCount: (count: number) => string;
  availableArticles: string;
  blockDescription: string;
  blockTitle: string;
  blockTitleAccentAction: string;
  blockTitleEditorAriaLabel: string;
  blockDropHint: string;
  dropArticlesHint: string;
  duplicateBlock: string;
  emptyArticles: string;
  featuredArticle: string;
  featuredFallback: string;
  featuredPlacement: string;
  featuredPlacementLeft: string;
  featuredPlacementRight: string;
  maxOneArticle: string;
  moveDown: string;
  moveUp: string;
  noBlocks: string;
  previewEmpty: string;
  removeBlock: string;
  selectedArticleOrder: string;
  sectionPagination: string;
  type: string;
  typeBody: string;
  typeClosing: string;
  typeOpening: string;
  typeRupture: string;
};

type IssueHomeBlocksEditorProps = {
  value: IssueHomeBlocks;
  articles: IssueHomeBlockArticle[];
  disabled?: boolean;
  text: IssueHomeBlocksEditorText;
  onChange: (value: IssueHomeBlocks) => void;
};

const blockTypeOptions = [
  { value: "opening", labelKey: "typeOpening" },
  { value: "body", labelKey: "typeBody" },
  { value: "rupture", labelKey: "typeRupture" },
  { value: "closing", labelKey: "typeClosing" },
] as const;

const featuredPlacementOptions = [
  { value: "left", labelKey: "featuredPlacementLeft" },
  { value: "right", labelKey: "featuredPlacementRight" },
] as const;

const articlePoolDroppableId = "article-pool";

type DraggedBlockData = {
  type: "block";
  blockId: string;
};

type DraggedArticleData = {
  type: "poolArticle" | "blockArticle";
  articleId: string;
  blockId?: string;
};

type DroppedArticleData =
  | { type: "pool" }
  | { type: "block" | "blockArticle"; blockId: string; articleId?: string };

function toNullableText(value: string) {
  return value.trim() ? value : null;
}

function updateBlockTitle(block: IssueHomeBlock, titleStyled: IssueTitleStyled) {
  const plainTitle = getStyledTitlePlainText(titleStyled);

  return {
    ...block,
    title: toNullableText(plainTitle),
    titleStyled: hasStyledTitleAccent(titleStyled) ? titleStyled : null,
  };
}

function getArticleCategoryLabel(article: IssueHomeBlockArticle) {
  return article.categoryName || article.categorySlug || null;
}

export function IssueHomeBlocksEditor({
  value,
  articles,
  disabled,
  text,
  onChange,
}: IssueHomeBlocksEditorProps) {
  const sensors = useSortableSensors();
  const [activeDrag, setActiveDrag] = useState<DraggedArticleData | DraggedBlockData | null>(null);
  const sortedArticles = articles;
  const articleById = new Map(sortedArticles.map((article) => [article.id, article]));
  const typeOptions = blockTypeOptions.map((option) => ({
    value: option.value,
    label: text[option.labelKey],
  }));
  const placementOptions = featuredPlacementOptions.map((option) => ({
    value: option.value,
    label: text[option.labelKey],
  }));
  const manualUsedArticleIds = new Set(value.flatMap((block) => block.articleIds));
  const unassignedArticles = sortedArticles.filter(
    (article) => !manualUsedArticleIds.has(article.id),
  );
  const activeArticle =
    activeDrag?.type === "poolArticle" || activeDrag?.type === "blockArticle"
      ? articleById.get(activeDrag.articleId)
      : null;

  const updateBlock = (index: number, nextBlock: IssueHomeBlock) => {
    onChange(
      value.map((block, blockIndex) =>
        blockIndex === index ? normalizeHomeBlock(nextBlock) : block,
      ),
    );
  };

  const removeBlock = (index: number) => {
    onChange(value.filter((_, blockIndex) => blockIndex !== index));
  };

  const duplicateBlock = (index: number) => {
    const block = value[index];

    if (!block) {
      return;
    }

    const clone = normalizeHomeBlock({
      ...block,
      id: `${block.type}-${Date.now().toString(36)}`,
      articleIds: [],
      featuredArticleId: null,
    });
    onChange([...value.slice(0, index + 1), clone, ...value.slice(index + 1)]);
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= value.length) {
      return;
    }

    onChange(reorderItems(value, index, nextIndex));
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDrag(event.active.data.current as DraggedArticleData | DraggedBlockData | null);
  };

  const handleDragCancel = () => {
    setActiveDrag(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDrag(null);
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const activeData = active.data.current as DraggedArticleData | DraggedBlockData | undefined;
    const overData = over.data.current as DroppedArticleData | DraggedBlockData | undefined;

    if (activeData?.type === "poolArticle" || activeData?.type === "blockArticle") {
      if (!overData) {
        return;
      }

      if (overData.type === "pool") {
        removeArticleFromBlocks(activeData.articleId);
        return;
      }

      if (overData.type === "block" || overData.type === "blockArticle") {
        moveArticleToBlock({
          articleId: activeData.articleId,
          targetBlockId: overData.blockId,
          beforeArticleId: overData.type === "blockArticle" ? overData.articleId : undefined,
        });
      }

      return;
    }

    if (activeData?.type !== "block" || !overData || overData.type === "pool") {
      return;
    }

    const targetBlockId = overData.type === "blockArticle" ? overData.blockId : overData.blockId;

    const oldIndex = value.findIndex((block) => block.id === active.id);
    const newIndex = value.findIndex((block) => block.id === targetBlockId);

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    onChange(arrayMove(value, oldIndex, newIndex));
  };

  const moveArticle = (block: IssueHomeBlock, articleIndex: number, direction: -1 | 1) => {
    const nextIndex = articleIndex + direction;

    if (nextIndex < 0 || nextIndex >= block.articleIds.length) {
      return block;
    }

    return normalizeHomeBlock({
      ...block,
      articleIds: reorderItems(block.articleIds, articleIndex, nextIndex),
    });
  };

  const removeArticleFromBlocks = (articleId: string) => {
    onChange(
      value.map((rawBlock) => {
        const block = normalizeHomeBlock(rawBlock);

        if (!block.articleIds.includes(articleId)) {
          return block;
        }

        return normalizeHomeBlock({
          ...block,
          articleIds: block.articleIds.filter((id) => id !== articleId),
        });
      }),
    );
  };

  const moveArticleToBlock = ({
    articleId,
    targetBlockId,
    beforeArticleId,
  }: {
    articleId: string;
    targetBlockId: string;
    beforeArticleId?: string;
  }) => {
    onChange(
      value.map((rawBlock) => {
        const block = normalizeHomeBlock(rawBlock);

        if (block.id !== targetBlockId) {
          return block.articleIds.includes(articleId)
            ? normalizeHomeBlock({
                ...block,
                articleIds: block.articleIds.filter((id) => id !== articleId),
              })
            : block;
        }

        const currentArticleIds = block.articleIds.filter((id) => id !== articleId);
        const insertIndex = beforeArticleId ? currentArticleIds.indexOf(beforeArticleId) : -1;
        const articleIds = isSingleArticleBlock(block.type)
          ? [articleId]
          : insertIndex >= 0
            ? [
                ...currentArticleIds.slice(0, insertIndex),
                articleId,
                ...currentArticleIds.slice(insertIndex),
              ]
            : [...currentArticleIds, articleId];

        return normalizeHomeBlock({ ...block, articleIds });
      }),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <CmsMetaText variant="category">{text.sectionPagination}</CmsMetaText>
        </div>
        <div className="flex flex-wrap gap-2">
          <CmsActionButton
            type="button"
            size="xs"
            variant="outline"
            disabled={disabled}
            onClick={() => onChange([...value, createEmptyHomeBlock()])}
          >
            <Plus aria-hidden />
            {text.addBlock}
          </CmsActionButton>
        </div>
      </div>

      {value.length === 0 ? (
        <div className="rounded-[6px] border border-dashed border-border bg-card-hover px-4 py-5">
          <CmsBody size="sm" tone="muted">
            {text.noBlocks}
          </CmsBody>
        </div>
      ) : null}

      <DndContext
        id="issue-home-blocks-editor"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <SortableContext
            items={value.map((block) => block.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {value.map((rawBlock, index) => {
                const block = normalizeHomeBlock(rawBlock);
                const selectedArticles = block.articleIds
                  .map((articleId) => articleById.get(articleId))
                  .filter((article): article is IssueHomeBlockArticle => Boolean(article));
                const featuredOptions = selectedArticles.map((article) => ({
                  value: article.id,
                  label: article.title,
                }));
                const showEditorialFields = !isEditorialSingleBlock(block.type);
                const showFeaturedField = !isSingleArticleBlock(block.type);
                const showFeaturedPlacementField =
                  block.type === "body" || block.type === "rupture";

                return (
                  <SortableBlockSection key={block.id} blockId={block.id} disabled={disabled}>
                    {({ dragHandleProps }) => (
                      <>
                        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
                          <div>
                            <CmsMetaText variant="category">
                              {index + 1}. {block.title || text.blockTitle}
                            </CmsMetaText>
                            <CmsBody size="sm" tone="muted">
                              {text.articleCount(block.articleIds.length)}
                            </CmsBody>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <CmsActionButton
                              type="button"
                              size="xs"
                              variant="ghost"
                              disabled={disabled}
                              aria-label={text.selectedArticleOrder}
                              {...dragHandleProps}
                            >
                              <GripVertical aria-hidden />
                            </CmsActionButton>
                            <CmsActionButton
                              type="button"
                              size="xs"
                              variant="ghost"
                              disabled={disabled || index === 0}
                              aria-label={text.moveUp}
                              onClick={() => moveBlock(index, -1)}
                            >
                              <ArrowUp aria-hidden />
                            </CmsActionButton>
                            <CmsActionButton
                              type="button"
                              size="xs"
                              variant="ghost"
                              disabled={disabled || index === value.length - 1}
                              aria-label={text.moveDown}
                              onClick={() => moveBlock(index, 1)}
                            >
                              <ArrowDown aria-hidden />
                            </CmsActionButton>
                            <CmsActionButton
                              type="button"
                              size="xs"
                              variant="ghost"
                              disabled={disabled}
                              aria-label={text.duplicateBlock}
                              onClick={() => duplicateBlock(index)}
                            >
                              <Copy aria-hidden />
                            </CmsActionButton>
                            <CmsActionButton
                              type="button"
                              size="xs"
                              variant="ghost"
                              disabled={disabled}
                              aria-label={text.removeBlock}
                              onClick={() => removeBlock(index)}
                            >
                              <Trash2 aria-hidden />
                            </CmsActionButton>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-4">
                            <CmsFormField label={text.type} htmlFor={`${block.id}-type`}>
                              <CmsSelect
                                value={block.type}
                                disabled={disabled}
                                options={typeOptions}
                                onValueChange={(nextType) =>
                                  updateBlock(
                                    index,
                                    normalizeHomeBlock({
                                      ...block,
                                      type: nextType as IssueHomeBlock["type"],
                                    }),
                                  )
                                }
                              />
                            </CmsFormField>

                            {showEditorialFields ? (
                              <>
                                <CmsFormField label={text.blockTitle} htmlFor={`${block.id}-title`}>
                                  <CmsStyledTitleEditor
                                    id={`${block.id}-title`}
                                    value={createStyledTitleValue(
                                      block.title ?? "",
                                      block.titleStyled,
                                    )}
                                    disabled={disabled}
                                    placeholder={text.blockTitle}
                                    accentLabel={text.blockTitleAccentAction}
                                    ariaLabel={text.blockTitleEditorAriaLabel}
                                    onChange={(nextTitleStyled) =>
                                      updateBlock(index, updateBlockTitle(block, nextTitleStyled))
                                    }
                                  />
                                </CmsFormField>

                                <CmsFormField
                                  label={text.blockDescription}
                                  htmlFor={`${block.id}-description`}
                                >
                                  <CmsTextarea
                                    id={`${block.id}-description`}
                                    value={block.description ?? ""}
                                    disabled={disabled}
                                    className="min-h-28"
                                    onChange={(event) =>
                                      updateBlock(index, {
                                        ...block,
                                        description: toNullableText(event.target.value),
                                      })
                                    }
                                  />
                                </CmsFormField>
                              </>
                            ) : null}

                            {showFeaturedField ? (
                              <CmsFormField
                                label={text.featuredArticle}
                                htmlFor={`${block.id}-featured`}
                              >
                                <CmsSelect
                                  value={block.featuredArticleId ?? ""}
                                  placeholder={text.featuredFallback}
                                  disabled={disabled || featuredOptions.length === 0}
                                  options={featuredOptions}
                                  onValueChange={(featuredArticleId) =>
                                    updateBlock(index, {
                                      ...block,
                                      featuredArticleId: featuredArticleId || null,
                                    })
                                  }
                                />
                              </CmsFormField>
                            ) : null}

                            {showFeaturedPlacementField ? (
                              <CmsFormField
                                label={text.featuredPlacement}
                                htmlFor={`${block.id}-featured-placement`}
                              >
                                <CmsSelect
                                  value={block.featuredPlacement}
                                  disabled={disabled}
                                  options={placementOptions}
                                  onValueChange={(featuredPlacement) =>
                                    updateBlock(index, {
                                      ...block,
                                      featuredPlacement:
                                        featuredPlacement as IssueHomeBlock["featuredPlacement"],
                                    })
                                  }
                                />
                              </CmsFormField>
                            ) : null}
                          </div>

                          <div className="space-y-3">
                            <div className="space-y-2">
                              <CmsMetaText variant="category">
                                {text.selectedArticleOrder}
                              </CmsMetaText>
                              <SelectedArticlesDropZone
                                blockId={block.id}
                                blockType={block.type}
                                selectedArticles={selectedArticles}
                                disabled={disabled}
                                text={text}
                                onMoveUp={(articleIndex) =>
                                  updateBlock(index, moveArticle(block, articleIndex, -1))
                                }
                                onMoveDown={(articleIndex) =>
                                  updateBlock(index, moveArticle(block, articleIndex, 1))
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </SortableBlockSection>
                );
              })}
            </div>
          </SortableContext>

          <ArticlePoolPanel articles={unassignedArticles} disabled={disabled} text={text} />
        </div>
        <DragOverlay dropAnimation={null}>
          {activeArticle ? <ArticleDragOverlay article={activeArticle} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function ArticleCategoryBadge({ article }: { article: IssueHomeBlockArticle }) {
  const categoryLabel = getArticleCategoryLabel(article);

  if (!categoryLabel) {
    return null;
  }

  return (
    <span className="shrink-0 border border-border px-1.5 py-0.5 font-ui text-[9px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
      {categoryLabel}
    </span>
  );
}

function ArticleDragCard({
  article,
  index,
  dragHandle,
  actions,
  isDragging,
  overlay,
}: {
  article: IssueHomeBlockArticle;
  index?: number;
  dragHandle?: ReactNode;
  actions?: ReactNode;
  isDragging?: boolean;
  overlay?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border border-border bg-card px-3 py-2",
        overlay && "w-80 border-foreground shadow-(--interactive-rail-shadow)",
        isDragging && !overlay && "opacity-40",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="block min-w-0 font-ui text-[12px] font-bold text-foreground">
            {index === undefined ? null : `${index + 1}. `}
            {article.title}
          </span>
          <ArticleCategoryBadge article={article} />
        </span>
        <span className="mt-1 block font-ui text-[10px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
          {article.status}
          {article.isFeatured ? " / featured" : ""}
        </span>
      </span>
      {(actions ?? dragHandle) ? (
        <span className="flex shrink-0 gap-1">
          {dragHandle}
          {actions}
        </span>
      ) : null}
    </div>
  );
}

function ArticleDragOverlay({ article }: { article: IssueHomeBlockArticle }) {
  return <ArticleDragCard article={article} overlay />;
}

function SortableBlockSection({
  blockId,
  disabled,
  children,
}: {
  blockId: string;
  disabled?: boolean;
  children: (props: { dragHandleProps: HTMLAttributes<HTMLButtonElement> }) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: blockId,
    data: { type: "block", blockId } satisfies DraggedBlockData,
    disabled,
  });
  const sectionTransform = transform ? { ...transform, x: 0, scaleX: 1, scaleY: 1 } : null;

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(sectionTransform), transition }}
      className={cn(
        "border border-foreground bg-card p-4",
        isDragging && "relative z-10 shadow-(--interactive-rail-shadow)",
      )}
    >
      {children({ dragHandleProps: disabled ? {} : { ...attributes, ...listeners } })}
    </section>
  );
}

function SelectedArticlesDropZone({
  blockId,
  blockType,
  selectedArticles,
  disabled,
  text,
  onMoveUp,
  onMoveDown,
}: {
  blockId: string;
  blockType: IssueHomeBlock["type"];
  selectedArticles: IssueHomeBlockArticle[];
  disabled?: boolean;
  text: IssueHomeBlocksEditorText;
  onMoveUp: (articleIndex: number) => void;
  onMoveDown: (articleIndex: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `selected-drop-${blockId}`,
    data: { type: "block", blockId } satisfies DroppedArticleData,
    disabled,
  });
  const isSingleBlock = isSingleArticleBlock(blockType);

  return (
    <SortableContext
      items={selectedArticles.map((article) => `block-article:${blockId}:${article.id}`)}
      strategy={verticalListSortingStrategy}
    >
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-24 space-y-2 border border-border bg-card p-3 transition-colors",
          isOver && "border-foreground bg-surface-hover",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CmsBody size="sm" tone="muted">
            {text.blockDropHint}
          </CmsBody>
          {isSingleBlock ? (
            <span className="border border-border px-1.5 py-0.5 font-ui text-[9px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
              {text.maxOneArticle}
            </span>
          ) : null}
        </div>
        {selectedArticles.length === 0 ? (
          <CmsBody size="sm" tone="muted">
            {text.previewEmpty}
          </CmsBody>
        ) : (
          selectedArticles.map((article, articleIndex) => (
            <SortableSelectedArticle
              key={article.id}
              article={article}
              blockId={blockId}
              index={articleIndex}
              disabled={disabled}
              moveUpLabel={text.moveUp}
              moveDownLabel={text.moveDown}
              canMoveUp={articleIndex > 0}
              canMoveDown={articleIndex < selectedArticles.length - 1}
              onMoveUp={() => onMoveUp(articleIndex)}
              onMoveDown={() => onMoveDown(articleIndex)}
            />
          ))
        )}
      </div>
    </SortableContext>
  );
}

function ArticlePoolPanel({
  articles,
  disabled,
  text,
}: {
  articles: IssueHomeBlockArticle[];
  disabled?: boolean;
  text: IssueHomeBlocksEditorText;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: articlePoolDroppableId,
    data: { type: "pool" } satisfies DroppedArticleData,
    disabled,
  });

  return (
    <aside className="xl:sticky xl:top-4 xl:self-start">
      <div
        ref={setNodeRef}
        className={cn(
          "space-y-3 border border-foreground bg-card-hover p-4 transition-colors",
          isOver && "bg-surface-hover",
        )}
      >
        <div className="space-y-1">
          <CmsMetaText variant="category">{text.availableArticles}</CmsMetaText>
          <CmsBody size="sm" tone="muted">
            {text.dropArticlesHint}
          </CmsBody>
        </div>

        {articles.length === 0 ? (
          <div className="rounded-[6px] border border-dashed border-border bg-card px-3 py-4">
            <CmsBody size="sm" tone="muted">
              {text.emptyArticles}
            </CmsBody>
          </div>
        ) : (
          <div className="max-h-[calc(100vh-12rem)] space-y-2 overflow-y-auto pr-1">
            {articles.map((article) => (
              <DraggableAvailableArticle key={article.id} article={article} disabled={disabled} />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

function DraggableAvailableArticle({
  article,
  disabled,
}: {
  article: IssueHomeBlockArticle;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `pool:${article.id}`,
    data: { type: "poolArticle", articleId: article.id } satisfies DraggedArticleData,
    disabled,
  });

  return (
    <div ref={setNodeRef} className={cn(disabled && "cursor-not-allowed opacity-60")}>
      <ArticleDragCard
        article={article}
        isDragging={isDragging}
        dragHandle={
          <button
            type="button"
            disabled={disabled}
            aria-label={article.title}
            className="inline-flex shrink-0 cursor-grab items-center justify-center rounded-lg p-1 text-muted-foreground transition-colors hover:bg-card-hover hover:text-foreground disabled:cursor-not-allowed active:cursor-grabbing"
            {...(!disabled ? attributes : {})}
            {...(!disabled ? listeners : {})}
          >
            <GripVertical className="size-3.5" aria-hidden />
          </button>
        }
      />
    </div>
  );
}

function SortableSelectedArticle({
  article,
  blockId,
  index,
  disabled,
  moveUpLabel,
  moveDownLabel,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: {
  article: IssueHomeBlockArticle;
  blockId: string;
  index: number;
  disabled?: boolean;
  moveUpLabel: string;
  moveDownLabel: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `block-article:${blockId}:${article.id}`,
    data: {
      type: "blockArticle",
      articleId: article.id,
      blockId,
    } satisfies DraggedArticleData & DroppedArticleData,
    disabled,
  });
  const articleTransform = transform ? { ...transform, x: 0, scaleX: 1, scaleY: 1 } : null;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(articleTransform), transition }}
      className={cn(!disabled && "touch-manipulation")}
    >
      <ArticleDragCard
        article={article}
        index={index}
        isDragging={isDragging}
        dragHandle={
          <CmsActionButton
            type="button"
            size="xs"
            variant="ghost"
            disabled={disabled}
            aria-label={moveUpLabel}
            {...(!disabled ? attributes : {})}
            {...(!disabled ? listeners : {})}
          >
            <GripVertical aria-hidden />
          </CmsActionButton>
        }
        actions={
          <>
            <CmsActionButton
              type="button"
              size="xs"
              variant="ghost"
              disabled={disabled || !canMoveUp}
              aria-label={moveUpLabel}
              onClick={onMoveUp}
            >
              <ArrowUp aria-hidden />
            </CmsActionButton>
            <CmsActionButton
              type="button"
              size="xs"
              variant="ghost"
              disabled={disabled || !canMoveDown}
              aria-label={moveDownLabel}
              onClick={onMoveDown}
            >
              <ArrowDown aria-hidden />
            </CmsActionButton>
          </>
        }
      />
    </div>
  );
}
