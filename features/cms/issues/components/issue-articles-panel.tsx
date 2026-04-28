"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Star } from "lucide-react";

import { CmsBadge } from "@/components/cms/primitives";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type IssueArticleRow = {
  id: string;
  title: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isFeatured: boolean;
};

type IssueArticlesPanelProps = {
  articles: IssueArticleRow[];
  onReorder: (orderedIds: string[]) => void;
  disabled?: boolean;
};

const statusBadgeVariant = {
  DRAFT: "status-draft",
  PUBLISHED: "status-published",
  ARCHIVED: "status-archived",
} as const;

export function IssueArticlesPanel({ articles, onReorder, disabled }: IssueArticlesPanelProps) {
  const listText = i18n.cms.lists.issues;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = articles.findIndex((article) => article.id === active.id);
    const newIndex = articles.findIndex((article) => article.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reordered = arrayMove(articles, oldIndex, newIndex).map((article) => article.id);
    onReorder(reordered);
  };

  return (
    <div className="border border-foreground bg-white">
      <div className="flex items-center justify-between border-b border-foreground px-3 py-2">
        <span className="font-ui text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
          {listText.articlesPanelTitle}
        </span>
        <span className="font-ui text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
          {articles.length}
        </span>
      </div>

      {articles.length === 0 ? (
        <div className="px-3 py-4 font-ui text-[11px] uppercase tracking-[0.04em] text-muted-foreground">
          {listText.articlesPanelEmpty}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={articles.map((article) => article.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="divide-y divide-border">
              {articles.map((article) => (
                <SortableArticleRow key={article.id} article={article} disabled={disabled} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SortableArticleRow({
  article,
  disabled,
}: {
  article: IssueArticleRow;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: article.id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn("flex items-center gap-2 bg-white px-3 py-2", isDragging && "z-10 shadow-md")}
    >
      <button
        type="button"
        className={cn(
          "inline-flex h-7 w-5 shrink-0 cursor-grab items-center justify-center text-muted-foreground",
          "hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1",
          isDragging && "cursor-grabbing",
          disabled && "cursor-not-allowed text-border hover:text-border",
        )}
        aria-label={i18n.cms.lists.issues.articlesPanelReorderAria(article.title)}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate font-editorial text-[14px] text-foreground">{article.title}</span>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {article.isFeatured ? (
          <Star
            className="h-3.5 w-3.5 text-accent"
            aria-label={i18n.cms.lists.issues.articlesPanelFeaturedAria}
          />
        ) : null}
        <CmsBadge variant={statusBadgeVariant[article.status]}>{article.status}</CmsBadge>
      </div>
    </li>
  );
}
