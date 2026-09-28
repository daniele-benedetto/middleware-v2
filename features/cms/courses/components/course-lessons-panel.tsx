"use client";

import { Plus } from "lucide-react";

import { CmsArticleListPanel } from "@/components/cms/common/article-list-panel";
import { CmsActionButton } from "@/components/cms/primitives";
import { cmsCrudRoutes } from "@/lib/cms/crud-routes";
import { i18n } from "@/lib/i18n";

export type CourseLessonRow = {
  id: string;
  title: string;
};

type CourseLessonsPanelProps = {
  courseId: string;
  lessons: CourseLessonRow[];
  disabled?: boolean;
  className?: string;
  addLabel: string;
  onAdd: () => void;
  onReorder: (orderedIds: string[]) => void | Promise<void>;
};

export function CourseLessonsPanel({
  courseId,
  lessons,
  disabled,
  className,
  addLabel,
  onAdd,
  onReorder,
}: CourseLessonsPanelProps) {
  const listText = i18n.cms.lists.courses;

  return (
    <CmsArticleListPanel
      title={listText.lessonsPanelTitle}
      emptyText={listText.lessonsPanelEmpty}
      articles={lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        href: cmsCrudRoutes.lessons.edit(courseId, lesson.id),
      }))}
      disabled={disabled}
      className={className}
      headerAction={
        <CmsActionButton variant="outline" size="xs" onClick={onAdd} disabled={disabled}>
          <Plus aria-hidden />
          {addLabel}
        </CmsActionButton>
      }
      onReorder={onReorder}
      dndContextId="cms-course-lessons-panel-dnd"
    />
  );
}
