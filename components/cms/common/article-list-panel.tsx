"use client";

import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Star } from "lucide-react";
import Link from "next/link";

import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type CmsArticleListPanelItem = {
  id: string;
  title: string;
  isFeatured: boolean;
  href?: string;
};

type CmsArticleListPanelProps = {
  title: string;
  emptyText: string;
  featuredAriaLabel: string;
  articles: CmsArticleListPanelItem[];
  className?: string;
  disabled?: boolean;
  onReorder?: (orderedIds: string[]) => void | Promise<void>;
  dndContextId?: string;
};

export function CmsArticleListPanel({
  title,
  emptyText,
  featuredAriaLabel,
  articles,
  className,
  disabled,
  onReorder,
  dndContextId,
}: CmsArticleListPanelProps) {
  const isReorderable = Boolean(onReorder);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 180,
        tolerance: 8,
      },
    }),
  );

  const handleDragEnd = ({
    active,
    over,
  }: {
    active: { id: string | number };
    over: { id: string | number } | null;
  }) => {
    if (!onReorder || !over) {
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId === overId) {
      return;
    }

    const currentOrder = articles.map((article) => article.id);
    const activeIndex = currentOrder.indexOf(activeId);
    const overIndex = currentOrder.indexOf(overId);

    if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) {
      return;
    }

    void onReorder(arrayMove(currentOrder, activeIndex, overIndex));
  };

  return (
    <div
      className={cn("flex h-full min-h-0 flex-col border border-foreground bg-white", className)}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-foreground px-3 py-2">
        <span className="font-ui text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
          {title}
        </span>
        <span className="font-ui text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
          {articles.length}
        </span>
      </div>

      {articles.length === 0 ? (
        <div className="px-3 py-4 font-ui text-[11px] uppercase tracking-[0.04em] text-muted-foreground">
          {emptyText}
        </div>
      ) : (
        <div className="cms-scroll min-h-0 flex-1 overflow-y-auto">
          <DndContext
            id={dndContextId}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <Table className="w-full border-collapse">
              <TableBody>
                <SortableContext
                  items={articles.map((article) => article.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {articles.map((article) => (
                    <SortableArticleListPanelRow
                      key={article.id}
                      article={article}
                      featuredAriaLabel={featuredAriaLabel}
                      disabled={disabled || !isReorderable}
                      isReorderable={isReorderable}
                    />
                  ))}
                </SortableContext>
              </TableBody>
            </Table>
          </DndContext>
        </div>
      )}
    </div>
  );
}

type SortableArticleListPanelRowProps = {
  article: CmsArticleListPanelItem;
  featuredAriaLabel: string;
  disabled?: boolean;
  isReorderable: boolean;
};

function SortableArticleListPanelRow({
  article,
  featuredAriaLabel,
  disabled,
  isReorderable,
}: SortableArticleListPanelRowProps) {
  const isDragEnabled = isReorderable && !disabled;
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
        "border-b border-foreground last:border-b-0 odd:bg-white even:bg-card-hover",
        isDragEnabled && "cursor-grab select-none touch-manipulation active:cursor-grabbing",
        isDragging && "relative z-10 bg-white shadow-[0_0_0_2px_var(--color-accent)]",
      )}
      {...(isDragEnabled ? attributes : {})}
      {...(isDragEnabled ? listeners : {})}
    >
      <TableCell className="border-r border-[color:rgba(10,10,10,0.1)] px-3.5 py-2.75 font-editorial text-[15px] leading-[1.3] text-foreground">
        {article.href ? (
          <Link href={article.href} className="block truncate hover:text-accent">
            {article.title}
          </Link>
        ) : (
          <span className="block truncate">{article.title}</span>
        )}
      </TableCell>
      <TableCell className="w-px px-2 py-2 text-center font-ui text-[11px] text-muted-foreground">
        {article.isFeatured ? (
          <Star className="inline-block h-3.5 w-3.5 text-accent" aria-label={featuredAriaLabel} />
        ) : null}
      </TableCell>
    </TableRow>
  );
}
