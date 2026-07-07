"use client";

import { CmsArticleListPanel } from "@/components/cms/common/article-list-panel";
import { cmsCrudRoutes } from "@/lib/cms/crud-routes";
import { i18n } from "@/lib/i18n";

export type CourseLessonRow = {
  id: string;
  title: string;
};

type CourseLessonsPanelProps = {
  lessons: CourseLessonRow[];
  disabled?: boolean;
  className?: string;
  onReorder: (orderedIds: string[]) => void | Promise<void>;
};

export function CourseLessonsPanel({
  lessons,
  disabled,
  className,
  onReorder,
}: CourseLessonsPanelProps) {
  const listText = i18n.cms.lists.courses;

  return (
    <CmsArticleListPanel
      title={listText.lessonsPanelTitle}
      emptyText={listText.lessonsPanelEmpty}
      featuredAriaLabel={listText.lessonsPanelFeaturedAria}
      articles={lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        isFeatured: false,
        href: cmsCrudRoutes.lessons.edit(lesson.id),
      }))}
      disabled={disabled}
      className={className}
      onReorder={onReorder}
      dndContextId="cms-course-lessons-panel-dnd"
    />
  );
}
