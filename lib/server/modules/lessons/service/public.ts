import "server-only";

import { resolvePublicMediaUrl } from "@/lib/media/blob";
import { extractPlainText } from "@/lib/rich-text/plain-text";
import { ApiError } from "@/lib/server/http/api-error";
import { publicLessonsRepository } from "@/lib/server/modules/lessons/repository/public";

import type {
  PublicLessonDetailDto,
  PublicLessonSummaryDto,
} from "@/lib/server/modules/lessons/dto/public";
import type { LessonTitleStyled } from "@/lib/server/modules/lessons/schema";

type PublicLessonSummaryRecord = {
  id: string;
  slug: string;
  title: string;
  titleStyled: unknown;
  excerpt: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  audioUrl: string | null;
  sortOrder: number;
  publishedAt: Date | null;
  courseId: string;
  course?: { slug: string; title: string } | null;
};

type PublicLessonDetailRecord = PublicLessonSummaryRecord & {
  updatedAt: Date;
  excerptRich: unknown;
  contentRich: unknown;
  audioChunks: unknown;
};

const WORDS_PER_MINUTE = 220;

const calculateReadingTimeMinutes = (contentRich: unknown) => {
  const text = extractPlainText(contentRich);
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
};

const toPublicLessonSummaryDto = (lesson: PublicLessonSummaryRecord): PublicLessonSummaryDto => {
  if (!lesson.publishedAt) {
    throw new ApiError(500, "INTERNAL_ERROR", "Public lesson missing publishedAt");
  }

  if (!lesson.course) {
    throw new ApiError(500, "INTERNAL_ERROR", "Public lesson missing required relations");
  }

  return {
    id: lesson.id,
    slug: lesson.slug,
    title: lesson.title,
    titleStyled: (lesson.titleStyled as LessonTitleStyled | null) ?? null,
    excerpt: lesson.excerpt,
    imageUrl: resolvePublicMediaUrl(lesson.imageUrl),
    imageAlt: lesson.imageAlt,
    hasAudio: Boolean(lesson.audioUrl),
    sortOrder: lesson.sortOrder,
    readingTimeMinutes: 1,
    publishedAt: lesson.publishedAt.toISOString(),
    courseId: lesson.courseId,
    courseSlug: lesson.course.slug,
    courseTitle: lesson.course.title,
  };
};

const toPublicLessonDetailDto = (lesson: PublicLessonDetailRecord): PublicLessonDetailDto => {
  return {
    ...toPublicLessonSummaryDto(lesson),
    readingTimeMinutes: calculateReadingTimeMinutes(lesson.contentRich),
    excerptRich: lesson.excerptRich ?? null,
    contentRich: lesson.contentRich,
    audioUrl: resolvePublicMediaUrl(lesson.audioUrl),
    audioChunks: lesson.audioChunks ?? null,
    updatedAt: lesson.updatedAt.toISOString(),
  };
};

const toPublicLessonSummaryDtos = (lessons: PublicLessonSummaryRecord[]) =>
  lessons.map(toPublicLessonSummaryDto);

export const publicLessonsService = {
  async getBySlug(courseSlug: string, lessonSlug: string) {
    const lesson = await publicLessonsRepository.getBySlug(courseSlug, lessonSlug);

    if (!lesson) {
      throw new ApiError(404, "NOT_FOUND", "Lesson not found");
    }

    return toPublicLessonDetailDto(lesson as PublicLessonDetailRecord);
  },
  async listByCourse(courseSlug: string) {
    const lessons = await publicLessonsRepository.listByCourseSlug(courseSlug);
    return toPublicLessonSummaryDtos(lessons as PublicLessonSummaryRecord[]);
  },
  async listWithAudio() {
    const lessons = await publicLessonsRepository.listWithAudio();
    return toPublicLessonSummaryDtos(lessons as PublicLessonSummaryRecord[]);
  },
};
