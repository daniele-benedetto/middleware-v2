import { i18n } from "@/lib/i18n";

import type { PublicLessonSibling } from "@/lib/public/server/course-page";
import type {
  PublicCourseDetailDto,
  PublicCourseLessonSummaryDto,
} from "@/lib/server/modules/courses/dto/public";
import type { PublicLessonDetailDto } from "@/lib/server/modules/lessons/dto/public";

type LessonPreviewContext = {
  lessonNumber: number | null;
  otherLessons: PublicCourseLessonSummaryDto[];
  previousLesson: PublicLessonSibling | null;
  nextLesson: PublicLessonSibling | null;
};

export function getLessonPreviewContext(
  lesson: PublicLessonDetailDto,
  course: PublicCourseDetailDto,
): LessonPreviewContext {
  const orderedLessons = course.lessons;
  const currentIndex = orderedLessons.findIndex((item) => item.id === lesson.id);

  if (currentIndex < 0) {
    return {
      lessonNumber: null,
      otherLessons: orderedLessons.filter((item) => item.id !== lesson.id),
      previousLesson: null,
      nextLesson: null,
    };
  }

  const previous = currentIndex > 0 ? orderedLessons[currentIndex - 1] : null;
  const next = currentIndex < orderedLessons.length - 1 ? orderedLessons[currentIndex + 1] : null;

  return {
    lessonNumber: currentIndex + 1,
    otherLessons: orderedLessons.filter((item) => item.id !== lesson.id),
    previousLesson: previous ? { slug: previous.slug, title: previous.title } : null,
    nextLesson: next ? { slug: next.slug, title: next.title } : null,
  };
}

export function getLessonStatusLabel(status: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
  const labels = {
    DRAFT: i18n.cms.lists.articles.statusDraft,
    PUBLISHED: i18n.cms.lists.articles.statusPublished,
    ARCHIVED: i18n.cms.lists.articles.statusArchived,
  } as const;

  return labels[status];
}
