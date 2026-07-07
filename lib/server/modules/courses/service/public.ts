import "server-only";

import { resolvePublicMediaUrl } from "@/lib/media/blob";
import { extractPlainText } from "@/lib/rich-text/plain-text";
import { ApiError } from "@/lib/server/http/api-error";
import { publicCoursesRepository } from "@/lib/server/modules/courses/repository/public";
import { courseHomeVariantSchema } from "@/lib/server/modules/courses/schema";

import type { PaginationParams } from "@/lib/server/http/pagination";
import type {
  PublicCourseDetailDto,
  PublicCourseDto,
  PublicCourseLessonSummaryDto,
} from "@/lib/server/modules/courses/dto/public";
import type { CourseTitleStyled } from "@/lib/server/modules/courses/schema";

type PublicCourseRecord = {
  id: string;
  title: string;
  titleStyled: unknown;
  slug: string;
  description: unknown;
  homeVariant?: string | null;
  publishedAt: Date | null;
  _count?: { lessons: number };
};

type PublicCourseLessonRecord = {
  id: string;
  slug: string;
  title: string;
  titleStyled: unknown;
  excerpt: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  audioUrl: string | null;
  sortOrder: number;
  contentRich: unknown;
  publishedAt: Date | null;
};

type PublicCourseDetailRecord = PublicCourseRecord & {
  lessons?: PublicCourseLessonRecord[];
};

const WORDS_PER_MINUTE = 220;

const calculateReadingTimeMinutes = (contentRich: unknown) => {
  const text = extractPlainText(contentRich);
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
};

const toPublicCourseDto = (course: PublicCourseRecord): PublicCourseDto => {
  if (!course.publishedAt) {
    throw new ApiError(500, "INTERNAL_ERROR", "Public course missing publishedAt");
  }

  return {
    id: course.id,
    title: course.title,
    titleStyled: (course.titleStyled as CourseTitleStyled | null) ?? null,
    slug: course.slug,
    description: course.description ?? null,
    homeVariant: courseHomeVariantSchema.parse(course.homeVariant ?? "black"),
    publishedAt: course.publishedAt.toISOString(),
    lessonsCount: course._count?.lessons ?? 0,
  };
};

const toPublicCourseLessonSummaryDto = (
  lesson: PublicCourseLessonRecord,
): PublicCourseLessonSummaryDto => {
  if (!lesson.publishedAt) {
    throw new ApiError(500, "INTERNAL_ERROR", "Public lesson missing publishedAt");
  }

  return {
    id: lesson.id,
    slug: lesson.slug,
    title: lesson.title,
    titleStyled: (lesson.titleStyled as CourseTitleStyled | null) ?? null,
    excerpt: lesson.excerpt,
    imageUrl: resolvePublicMediaUrl(lesson.imageUrl),
    imageAlt: lesson.imageAlt,
    hasAudio: Boolean(lesson.audioUrl),
    sortOrder: lesson.sortOrder,
    readingTimeMinutes: calculateReadingTimeMinutes(lesson.contentRich),
    publishedAt: lesson.publishedAt.toISOString(),
  };
};

const toPublicCourseDetailDto = (course: PublicCourseDetailRecord): PublicCourseDetailDto => {
  return {
    ...toPublicCourseDto(course),
    lessons: (course.lessons ?? []).map(toPublicCourseLessonSummaryDto),
  };
};

export const publicCoursesService = {
  async listPublishedItems(pagination: PaginationParams) {
    const courses = await publicCoursesRepository.listPublished(pagination);
    return courses.map(toPublicCourseDto);
  },
  async listPublished(pagination: PaginationParams) {
    const [courses, total] = await Promise.all([
      publicCoursesRepository.listPublished(pagination),
      publicCoursesRepository.countPublished(),
    ]);

    return {
      items: courses.map(toPublicCourseDto),
      total,
    };
  },
  async getBySlug(slug: string) {
    const course = await publicCoursesRepository.getBySlug(slug);

    if (!course) {
      throw new ApiError(404, "NOT_FOUND", "Course not found");
    }

    return toPublicCourseDetailDto(course);
  },
};
