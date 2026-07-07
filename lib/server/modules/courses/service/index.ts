import "server-only";

import { createCmsDomainErrorDetails } from "@/lib/cms/errors/domain-error-details";
import { Prisma } from "@/lib/generated/prisma/client";
import { resolvePublicMediaUrl } from "@/lib/media/blob";
import { extractPlainText } from "@/lib/rich-text/plain-text";
import { ApiError } from "@/lib/server/http/api-error";
import { coursesRepository } from "@/lib/server/modules/courses/repository";
import { courseHomeVariantSchema } from "@/lib/server/modules/courses/schema";
import { normalizeSlug } from "@/lib/server/validation/slug";

import type { LessonStatus } from "@/lib/generated/prisma/enums";
import type { PaginationParams } from "@/lib/server/http/pagination";
import type { CourseDetailDto, CourseDto } from "@/lib/server/modules/courses/dto";
import type { PublicCourseDetailDto } from "@/lib/server/modules/courses/dto/public";
import type {
  CourseTitleStyled,
  CreateCourseInput,
  ListCoursesQuery,
  ReorderCoursesInput,
  UpdateCourseInput,
} from "@/lib/server/modules/courses/schema";

type CourseRecord = {
  id: string;
  title: string;
  titleStyled: unknown;
  slug: string;
  description: unknown;
  homeVariant?: string | null;
  isActive: boolean;
  sortOrder: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { lessons: number };
};

type CourseDetailRecord = CourseRecord & {
  lessons?: Array<{
    id: string;
    title: string;
    slug: string;
    status: LessonStatus;
    sortOrder: number;
  }>;
};

type CoursePreviewRecord = CourseRecord & {
  lessons?: Array<{
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
    createdAt: Date;
    updatedAt: Date;
  }>;
};

const WORDS_PER_MINUTE = 220;

const calculateReadingTimeMinutes = (contentRich: unknown) => {
  const text = extractPlainText(contentRich);
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
};

const toCourseDto = (course: CourseRecord): CourseDto => {
  return {
    id: course.id,
    title: course.title,
    titleStyled: (course.titleStyled as CourseTitleStyled | null) ?? null,
    slug: course.slug,
    description: course.description ?? null,
    homeVariant: courseHomeVariantSchema.parse(course.homeVariant ?? "black"),
    isActive: course.isActive,
    sortOrder: course.sortOrder,
    publishedAt: course.publishedAt?.toISOString() ?? null,
    createdAt: course.createdAt.toISOString(),
    updatedAt: course.updatedAt.toISOString(),
    lessonsCount: course._count?.lessons ?? 0,
  };
};

const toCourseDetailDto = (course: CourseDetailRecord): CourseDetailDto => {
  return {
    ...toCourseDto(course),
    lessons: (course.lessons ?? []).map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      slug: lesson.slug,
      status: lesson.status,
      sortOrder: lesson.sortOrder,
    })),
  };
};

const toPreviewPublishedAt = (publishedAt: Date | null, fallback: Date) => {
  return (publishedAt ?? fallback).toISOString();
};

const toPublicCoursePreviewDto = (course: CoursePreviewRecord): PublicCourseDetailDto => {
  return {
    id: course.id,
    title: course.title,
    titleStyled: (course.titleStyled as CourseTitleStyled | null) ?? null,
    slug: course.slug,
    description: course.description ?? null,
    homeVariant: courseHomeVariantSchema.parse(course.homeVariant ?? "black"),
    publishedAt: toPreviewPublishedAt(course.publishedAt, course.updatedAt),
    lessonsCount: course._count?.lessons ?? 0,
    lessons: (course.lessons ?? []).map((lesson) => ({
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
      publishedAt: toPreviewPublishedAt(lesson.publishedAt, lesson.updatedAt),
    })),
  };
};

const ensureSlug = (value: string): string => {
  const slug = normalizeSlug(value);

  if (!slug) {
    throw new ApiError(400, "VALIDATION_ERROR", "Slug is required");
  }

  return slug;
};

const SLUG_SUFFIX_MAX_ATTEMPTS = 100;

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

export const coursesService = {
  async list(query: ListCoursesQuery, pagination: PaginationParams) {
    const [courses, total] = await Promise.all([
      coursesRepository.list(query, pagination),
      coursesRepository.count(query),
    ]);

    return {
      items: courses.map(toCourseDto),
      total,
    };
  },
  async getById(id: string) {
    const course = await coursesRepository.getById(id);

    if (!course) {
      throw new ApiError(404, "NOT_FOUND", "Course not found");
    }

    return toCourseDetailDto(course as CourseDetailRecord);
  },
  async getPreviewById(id: string) {
    const course = await coursesRepository.getPreviewById(id);

    if (!course) {
      throw new ApiError(404, "NOT_FOUND", "Course not found");
    }

    return toPublicCoursePreviewDto(course as CoursePreviewRecord);
  },
  async create(input: CreateCourseInput) {
    const baseSlug = ensureSlug(input.slug ?? input.title);

    for (let attempt = 0; attempt < SLUG_SUFFIX_MAX_ATTEMPTS; attempt += 1) {
      const candidateSlug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt}`;

      try {
        const course = await coursesRepository.create({
          title: input.title,
          titleStyled: input.titleStyled ?? null,
          slug: candidateSlug,
          description: input.description,
          homeVariant: input.homeVariant,
          isActive: input.isActive,
          publishedAt: input.publishedAt ?? null,
        });
        const courseWithCount = await coursesRepository.getById(course.id);

        if (!courseWithCount) {
          throw new ApiError(404, "NOT_FOUND", "Course not found");
        }

        return toCourseDto(courseWithCount);
      } catch (error) {
        if (isUniqueViolation(error)) {
          continue;
        }

        throw error;
      }
    }

    throw new ApiError(
      409,
      "CONFLICT",
      "Course slug already exists",
      createCmsDomainErrorDetails("COURSE_SLUG_EXISTS"),
    );
  },
  async update(id: string, input: UpdateCourseInput) {
    const normalizedInput: UpdateCourseInput = {
      ...input,
      slug: input.slug ? ensureSlug(input.slug) : undefined,
    };

    try {
      await coursesRepository.update(id, normalizedInput);
      const course = await coursesRepository.getById(id);

      if (!course) {
        throw new ApiError(404, "NOT_FOUND", "Course not found");
      }

      return toCourseDto(course);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new ApiError(404, "NOT_FOUND", "Course not found");
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ApiError(
          409,
          "CONFLICT",
          "Course slug already exists",
          createCmsDomainErrorDetails("COURSE_SLUG_EXISTS"),
        );
      }

      throw error;
    }
  },
  async delete(id: string) {
    try {
      await coursesRepository.delete(id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new ApiError(404, "NOT_FOUND", "Course not found");
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new ApiError(
          409,
          "CONFLICT",
          "Course cannot be deleted due to related records",
          createCmsDomainErrorDetails("COURSE_DELETE_HAS_LESSONS"),
        );
      }

      throw error;
    }
  },
  async reorder(input: ReorderCoursesInput) {
    const current = await coursesRepository.listIdsOrderedBySortOrder();

    if (current.length === 0) {
      throw new ApiError(404, "NOT_FOUND", "No courses found for reorder");
    }

    const currentIds = current.map((course) => course.id);
    const expected = new Set(currentIds);
    const received = new Set(input.orderedCourseIds);

    const sameLength = input.orderedCourseIds.length === currentIds.length;
    const sameElements =
      sameLength &&
      currentIds.every((id) => received.has(id)) &&
      input.orderedCourseIds.every((id) => expected.has(id));

    if (!sameElements) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "orderedCourseIds must include all and only existing courses",
      );
    }

    const reordered = await coursesRepository.reorder(input);

    return reordered.map(toCourseDto);
  },
};
