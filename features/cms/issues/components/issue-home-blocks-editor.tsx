"use client";

import {
  DndContext,
  closestCenter,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, Copy, GripVertical, Plus, Trash2 } from "lucide-react";

import { CmsConfirmDialog } from "@/components/cms/common";
import {
  CmsActionButton,
  CmsBody,
  CmsCheckbox,
  CmsFormField,
  CmsMetaText,
  CmsSelect,
  CmsTextarea,
  CmsTextInput,
} from "@/components/cms/primitives";
import { IssueHomeBlocksPreview } from "@/features/cms/issues/components/issue-home-blocks-preview";
import { useSortableSensors } from "@/features/cms/shared/hooks/use-sortable-sensors";
import {
  createEmptyHomeBlock,
  isEditorialSingleBlock,
  isSingleArticleBlock,
  normalizeHomeBlock,
  reorderItems,
} from "@/lib/issues/home-block-rules";
import { cn } from "@/lib/utils";

import type { IssueHomeBlock, IssueHomeBlocks } from "@/lib/server/modules/issues/schema";
import type { HTMLAttributes, ReactNode } from "react";

type IssueHomeBlockArticle = {
  id: string;
  title: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isFeatured: boolean;
  position: number;
  categoryName?: string | null;
  categorySlug?: string | null;
};

type IssueHomeBlocksEditorText = {
  addBlock: string;
  advancedJson: string;
  articleCount: (count: number) => string;
  blockDescription: string;
  blockTitle: string;
  diagnostics: string;
  diagnosticsEmptyBlocks: (count: number) => string;
  diagnosticsNoIssues: string;
  diagnosticsSummary: (used: number, total: number, unused: number) => string;
  diagnosticsUnusedArticles: (titles: string) => string;
  dropArticlesHint: string;
  duplicateBlock: string;
  emptyArticles: string;
  featuredArticle: string;
  featuredFallback: string;
  generateSuggested: string;
  generateSuggestedConfirmDescription: string;
  generateSuggestedConfirmTitle: string;
  maxOneArticle: string;
  moveDown: string;
  moveUp: string;
  noBlocks: string;
  preview: string;
  previewEmpty: string;
  previewFeatured: string;
  removeBlock: string;
  selectedArticleOrder: string;
  selectedArticles: string;
  source: string;
  sourceManual: string;
  sourceRemainder: string;
  type: string;
  typeConstellation: string;
  typeClosing: string;
  typeOpening: string;
  typeRupture: string;
  typeSequence: string;
};

type IssueHomeBlocksEditorProps = {
  value: IssueHomeBlocks;
  articles: IssueHomeBlockArticle[];
  disabled?: boolean;
  text: IssueHomeBlocksEditorText;
  onChange: (value: IssueHomeBlocks) => void;
  onGenerateSuggested?: () => void;
};

const blockTypeOptions = [
  { value: "opening", labelKey: "typeOpening" },
  { value: "constellation", labelKey: "typeConstellation" },
  { value: "rupture", labelKey: "typeRupture" },
  { value: "sequence", labelKey: "typeSequence" },
  { value: "closing", labelKey: "typeClosing" },
] as const;

const sourceOptions = [
  { value: "manual", labelKey: "sourceManual" },
  { value: "remainder", labelKey: "sourceRemainder" },
] as const;

function toNullableText(value: string) {
  const trimmed = value.trim();
  return trimmed || null;
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
  onGenerateSuggested,
}: IssueHomeBlocksEditorProps) {
  const sensors = useSortableSensors();
  const sortedArticles = [...articles].sort((a, b) => a.position - b.position);
  const articleById = new Map(sortedArticles.map((article) => [article.id, article]));
  const typeOptions = blockTypeOptions.map((option) => ({
    value: option.value,
    label: text[option.labelKey],
  }));
  const sourceSelectOptions = sourceOptions.map((option) => ({
    value: option.value,
    label: text[option.labelKey],
  }));
  const manualUsedArticleIds = new Set(
    value.flatMap((block) => (block.source === "remainder" ? [] : block.articleIds)),
  );

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

  const handleBlockDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = value.findIndex((block) => block.id === active.id);
    const newIndex = value.findIndex((block) => block.id === over.id);

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    onChange(arrayMove(value, oldIndex, newIndex));
  };

  const toggleArticle = (block: IssueHomeBlock, articleId: string, checked: boolean) => {
    const articleIds = checked
      ? isSingleArticleBlock(block.type)
        ? [articleId]
        : block.articleIds.includes(articleId)
          ? block.articleIds
          : [...block.articleIds, articleId]
      : block.articleIds.filter((id) => id !== articleId);

    const featuredArticleId =
      block.featuredArticleId && articleIds.includes(block.featuredArticleId)
        ? block.featuredArticleId
        : (articleIds[0] ?? null);

    return normalizeHomeBlock({ ...block, articleIds, featuredArticleId });
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

  const moveArticleToId = (block: IssueHomeBlock, activeId: string, overId: string) => {
    const oldIndex = block.articleIds.indexOf(activeId);
    const newIndex = block.articleIds.indexOf(overId);

    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
      return block;
    }

    return normalizeHomeBlock({
      ...block,
      articleIds: arrayMove(block.articleIds, oldIndex, newIndex),
    });
  };

  const addArticleToBlock = (block: IssueHomeBlock, articleId: string, overId: string | null) => {
    const currentArticleIds = block.articleIds.filter((id) => id !== articleId);
    const insertIndex = overId ? currentArticleIds.indexOf(overId) : -1;
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
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <CmsMetaText variant="category">{text.blockTitle}</CmsMetaText>
          <CmsBody size="sm" tone="muted">
            {text.articleCount(value.length)}
          </CmsBody>
        </div>
        <div className="flex flex-wrap gap-2">
          {onGenerateSuggested ? (
            value.length > 0 ? (
              <CmsConfirmDialog
                triggerLabel={text.generateSuggested}
                triggerDisabled={disabled || sortedArticles.length === 0}
                title={text.generateSuggestedConfirmTitle}
                description={text.generateSuggestedConfirmDescription}
                confirmLabel={text.generateSuggested}
                tone="default"
                onConfirm={onGenerateSuggested}
              />
            ) : (
              <CmsActionButton
                type="button"
                size="xs"
                variant="outline"
                disabled={disabled || sortedArticles.length === 0}
                onClick={onGenerateSuggested}
              >
                {text.generateSuggested}
              </CmsActionButton>
            )
          ) : null}
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

      <IssueHomeBlocksPreview blocks={value} articles={sortedArticles} text={text} />

      <HomeBlocksDiagnostics blocks={value} articles={sortedArticles} text={text} />

      <HomeBlocksAdvancedJson blocks={value} text={text} />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleBlockDragEnd}
      >
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
              const availableArticles = sortedArticles.filter(
                (article) =>
                  block.articleIds.includes(article.id) || !manualUsedArticleIds.has(article.id),
              );
              const featuredOptions = selectedArticles.map((article) => ({
                value: article.id,
                label: article.title,
              }));
              const showEditorialFields = !isEditorialSingleBlock(block.type);
              const showArticleTools = block.source !== "remainder";
              const showFeaturedField = showArticleTools && !isSingleArticleBlock(block.type);

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

                      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
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

                          <CmsFormField label={text.source} htmlFor={`${block.id}-source`}>
                            <CmsSelect
                              value={block.source ?? "manual"}
                              disabled={disabled}
                              options={sourceSelectOptions}
                              onValueChange={(source) =>
                                updateBlock(
                                  index,
                                  normalizeHomeBlock({
                                    ...block,
                                    source: source as IssueHomeBlock["source"],
                                  }),
                                )
                              }
                            />
                          </CmsFormField>

                          {showEditorialFields ? (
                            <>
                              <CmsFormField label={text.blockTitle} htmlFor={`${block.id}-title`}>
                                <CmsTextInput
                                  id={`${block.id}-title`}
                                  value={block.title ?? ""}
                                  disabled={disabled}
                                  onChange={(event) =>
                                    updateBlock(index, {
                                      ...block,
                                      title: toNullableText(event.target.value),
                                    })
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
                        </div>

                        <div className="space-y-3">
                          {showArticleTools ? (
                            <DndContext
                              sensors={sensors}
                              collisionDetection={closestCenter}
                              onDragEnd={({ active, over }) => {
                                if (!over) {
                                  return;
                                }

                                const draggedArticleId = active.data.current?.articleId;

                                if (typeof draggedArticleId === "string") {
                                  const overId = String(over.id);
                                  updateBlock(
                                    index,
                                    addArticleToBlock(
                                      block,
                                      draggedArticleId,
                                      overId.startsWith("selected-drop-") ? null : overId,
                                    ),
                                  );
                                  return;
                                }

                                if (active.id !== over.id) {
                                  updateBlock(
                                    index,
                                    moveArticleToId(block, String(active.id), String(over.id)),
                                  );
                                }
                              }}
                            >
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

                              <CmsMetaText variant="category">{text.selectedArticles}</CmsMetaText>
                              {availableArticles.length === 0 ? (
                                <div className="rounded-[6px] border border-dashed border-border bg-card-hover px-3 py-4">
                                  <CmsBody size="sm" tone="muted">
                                    {text.emptyArticles}
                                  </CmsBody>
                                </div>
                              ) : (
                                <div className="max-h-94 space-y-2 overflow-y-auto border border-border bg-card-hover p-3">
                                  {availableArticles.map((article) => (
                                    <DraggableAvailableArticle
                                      key={article.id}
                                      article={article}
                                      checked={block.articleIds.includes(article.id)}
                                      disabled={disabled}
                                      onToggle={(nextChecked) =>
                                        updateBlock(
                                          index,
                                          toggleArticle(block, article.id, nextChecked),
                                        )
                                      }
                                    />
                                  ))}
                                </div>
                              )}
                            </DndContext>
                          ) : (
                            <div className="rounded-[6px] border border-dashed border-border bg-card-hover px-3 py-4">
                              <CmsBody size="sm" tone="muted">
                                {text.sourceRemainder}
                              </CmsBody>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </SortableBlockSection>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function HomeBlocksAdvancedJson({
  blocks,
  text,
}: {
  blocks: IssueHomeBlocks;
  text: IssueHomeBlocksEditorText;
}) {
  if (blocks.length === 0) {
    return null;
  }

  return (
    <details className="border border-border bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:hidden">
        <span className="font-ui text-[10px] font-bold tracking-[0.08em] text-foreground uppercase">
          {text.advancedJson}
        </span>
        <span className="font-ui text-[10px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
          JSON
        </span>
      </summary>
      <div className="border-t border-border p-3">
        <textarea
          value={JSON.stringify(blocks, null, 2)}
          readOnly
          spellCheck={false}
          className="min-h-72 w-full resize-y border border-border bg-card-hover p-3 font-technical text-[11px] leading-[1.45] text-foreground outline-none"
        />
      </div>
    </details>
  );
}

function HomeBlocksDiagnostics({
  blocks,
  articles,
  text,
}: {
  blocks: IssueHomeBlocks;
  articles: IssueHomeBlockArticle[];
  text: IssueHomeBlocksEditorText;
}) {
  const normalizedBlocks = blocks.map(normalizeHomeBlock);
  const manualUsedArticleIds = new Set(
    normalizedBlocks.flatMap((block) => (block.source === "remainder" ? [] : block.articleIds)),
  );
  const usedArticleIds = new Set(manualUsedArticleIds);

  if (normalizedBlocks.some((block) => block.source === "remainder")) {
    for (const article of articles) {
      if (!manualUsedArticleIds.has(article.id)) {
        usedArticleIds.add(article.id);
      }
    }
  }
  const unusedArticles = articles.filter((article) => !usedArticleIds.has(article.id));
  const emptyBlockCount = normalizedBlocks.filter((block) => block.articleIds.length === 0).length;
  const hasWarnings = unusedArticles.length > 0 || emptyBlockCount > 0;

  if (articles.length === 0 && blocks.length === 0) {
    return null;
  }

  return (
    <details className="group border border-border bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:hidden">
        <span className="font-ui text-[10px] font-bold tracking-[0.08em] text-foreground uppercase">
          {text.diagnostics}
        </span>
        <span className="font-ui text-[10px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
          {text.diagnosticsSummary(usedArticleIds.size, articles.length, unusedArticles.length)}
        </span>
      </summary>
      <div className="border-t border-border px-4 py-3">
        {hasWarnings ? (
          <div className="space-y-2">
            {emptyBlockCount > 0 ? (
              <CmsBody size="sm" tone="muted">
                {text.diagnosticsEmptyBlocks(emptyBlockCount)}
              </CmsBody>
            ) : null}
            {unusedArticles.length > 0 ? (
              <CmsBody size="sm" tone="muted">
                {text.diagnosticsUnusedArticles(
                  unusedArticles.map((article) => article.title).join(", "),
                )}
              </CmsBody>
            ) : null}
          </div>
        ) : (
          <CmsBody size="sm" tone="muted">
            {text.diagnosticsNoIssues}
          </CmsBody>
        )}
      </div>
    </details>
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
    disabled,
  });
  const sectionTransform = transform ? { ...transform, x: 0, scaleX: 1, scaleY: 1 } : null;

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(sectionTransform), transition }}
      className={cn(
        "border border-foreground bg-white p-4",
        isDragging && "relative z-10 shadow-[var(--interactive-rail-shadow)]",
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
  const { setNodeRef, isOver } = useDroppable({ id: `selected-drop-${blockId}`, disabled });
  const isSingleBlock = isSingleArticleBlock(blockType);

  return (
    <SortableContext
      items={selectedArticles.map((article) => article.id)}
      strategy={verticalListSortingStrategy}
    >
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-24 space-y-2 border border-border bg-white p-3 transition-colors",
          isOver && "border-foreground bg-surface-hover",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CmsBody size="sm" tone="muted">
            {text.dropArticlesHint}
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

function DraggableAvailableArticle({
  article,
  checked,
  disabled,
  onToggle,
}: {
  article: IssueHomeBlockArticle;
  checked: boolean;
  disabled?: boolean;
  onToggle: (checked: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `available-${article.id}`,
    data: { articleId: article.id },
    disabled,
  });
  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  return (
    <label
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-[6px] border bg-white p-3 transition-colors",
        checked ? "border-foreground" : "border-border hover:border-foreground",
        disabled && "cursor-not-allowed opacity-60",
        isDragging && "relative z-10 bg-surface-hover shadow-[var(--interactive-rail-shadow)]",
      )}
    >
      <CmsCheckbox label="" checked={checked} disabled={disabled} onChange={onToggle} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="block min-w-0 font-ui text-[12px] font-bold text-foreground">
            {String(article.position).padStart(2, "0")} / {article.title}
          </span>
          <ArticleCategoryBadge article={article} />
        </span>
        <span className="mt-1 block font-ui text-[10px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
          {article.status}
          {article.isFeatured ? " / featured" : ""}
        </span>
      </span>
      <button
        type="button"
        disabled={disabled}
        aria-label={article.title}
        className="inline-flex shrink-0 cursor-grab items-center justify-center rounded-[4px] p-1 text-muted-foreground transition-colors hover:bg-card-hover hover:text-foreground disabled:cursor-not-allowed active:cursor-grabbing"
        {...(!disabled ? attributes : {})}
        {...(!disabled ? listeners : {})}
      >
        <GripVertical className="size-3.5" aria-hidden />
      </button>
    </label>
  );
}

function SortableSelectedArticle({
  article,
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
    id: article.id,
    disabled,
  });
  const articleTransform = transform ? { ...transform, x: 0, scaleX: 1, scaleY: 1 } : null;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(articleTransform), transition }}
      className={cn(
        "flex items-center justify-between gap-3 border border-border px-3 py-2",
        !disabled && "touch-manipulation",
        isDragging && "relative z-10 bg-surface-hover shadow-[var(--interactive-rail-shadow)]",
      )}
    >
      <span className="min-w-0 font-ui text-[12px] font-bold text-foreground">
        {index + 1}. {article.title}
      </span>
      <ArticleCategoryBadge article={article} />
      <span className="flex shrink-0 gap-1">
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
      </span>
    </div>
  );
}
