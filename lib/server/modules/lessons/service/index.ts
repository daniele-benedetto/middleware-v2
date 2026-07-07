import "server-only";

import { createCmsDomainErrorDetails } from "@/lib/cms/errors/domain-error-details";
import { Prisma } from "@/lib/generated/prisma/client";
import { resolvePublicMediaUrl } from "@/lib/media/blob";
import { extractPlainText } from "@/lib/rich-text/plain-text";
import { ApiError } from "@/lib/server/http/api-error";
import { lessonsRepository } from "@/lib/server/modules/lessons/repository";
import { assertPublishedAtConsistency } from "@/lib/server/validation/published";
import { normalizeSlug } from "@/lib/server/validation/slug";

import type { LessonStatus } from "@/lib/generated/prisma/enums";
import type { PaginationParams } from "@/lib/server/http/pagination";
import type { LessonDetailDto, LessonDto } from "@/lib/server/modules/lessons/dto";
import type { PublicLessonDetailDto } from "@/lib/server/modules/lessons/dto/public";
import type {
  CreateLessonPersistInput,
  UpdateLessonPersistInput,
} from "@/lib/server/modules/lessons/repository";
import type {
  CreateLessonInput,
  LessonTitleStyled,
  ListLessonsQuery,
  ReorderLessonsInput,
  UpdateLessonInput,
} from "@/lib/server/modules/lessons/schema";

const WORDS_PER_MINUTE = 220;

const calculateReadingTimeMinutes = (contentRich: unknown) => {
  const text = extractPlainText(contentRich);
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
};

const ensureSlug = (value: string): string => {
  const slug = normalizeSlug(value);

  if (!slug) {
    throw new ApiError(400, "VALIDATION_ERROR", "Slug is required");
  }

  return slug;
};

function createRichTextDocFromPlainText(value: string): unknown {
  const paragraphs = value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({
      type: "paragraph",
      content: [{ type: "text", text: line }],
    }));

  return {
    type: "doc",
    content: paragraphs.length > 0 ? paragraphs : [{ type: "paragraph" }],
  };
}

function toCreateExcerptPersist(
  input: CreateLessonInput,
): Pick<CreateLessonPersistInput, "excerpt" | "excerptRich"> {
  if (input.excerptRich === undefined) {
    return {};
  }

  return {
    excerpt: extractPlainText(input.excerptRich) ?? undefined,
    excerptRich: input.excerptRich,
  };
}

function toUpdateExcerptPersist(
  input: UpdateLessonInput,
): Pick<UpdateLessonPersistInput, "excerpt" | "excerptRich"> {
  if (input.excerptRich === undefined) {
    return {};
  }

  return {
    excerpt: input.excerptRich === null ? null : (extractPlainText(input.excerptRich) ?? null),
    excerptRich: input.excerptRich,
  };
}

type LessonRecord = {
  id: string;
  courseId: string;
  title: string;
  titleStyled: unknown;
  slug: string;
  status: LessonStatus;
  sortOrder: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  course?: { slug?: string; title: string } | null;
};

type LessonDetailRecord = LessonRecord & {
  excerpt: string | null;
  excerptRich: unknown;
  contentRich: unknown;
  imageUrl: string | null;
  imageAlt: string | null;
  audioUrl: string | null;
  audioChunks: unknown;
};

const toLessonDto = (lesson: LessonRecord): LessonDto => {
  return {
    id: lesson.id,
    courseId: lesson.courseId,
    title: lesson.title,
    titleStyled: (lesson.titleStyled as LessonTitleStyled | null) ?? null,
    slug: lesson.slug,
    status: lesson.status,
    sortOrder: lesson.sortOrder,
    publishedAt: lesson.publishedAt?.toISOString() ?? null,
    createdAt: lesson.createdAt.toISOString(),
    updatedAt: lesson.updatedAt.toISOString(),
    courseTitle: lesson.course?.title ?? null,
  };
};

const toLessonDetailDto = (lesson: LessonDetailRecord): LessonDetailDto => {
  return {
    ...toLessonDto(lesson),
    excerpt: lesson.excerpt,
    excerptRich:
      lesson.excerptRich ??
      (lesson.excerpt ? createRichTextDocFromPlainText(lesson.excerpt) : null),
    contentRich: lesson.contentRich,
    imageUrl: lesson.imageUrl,
    imageAlt: lesson.imageAlt,
    audioUrl: lesson.audioUrl,
    audioChunks: (lesson.audioChunks ?? null) as LessonDetailDto["audioChunks"],
  };
};

const toPreviewPublishedAt = (lesson: LessonDetailRecord) => {
  return (lesson.publishedAt ?? lesson.updatedAt ?? lesson.createdAt).toISOString();
};

const toPublicLessonPreviewDto = (lesson: LessonDetailRecord): PublicLessonDetailDto => {
  if (!lesson.course?.slug) {
    throw new ApiError(500, "INTERNAL_ERROR", "Lesson preview missing required relations");
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
    readingTimeMinutes: calculateReadingTimeMinutes(lesson.contentRich),
    publishedAt: toPreviewPublishedAt(lesson),
    courseId: lesson.courseId,
    courseSlug: lesson.course.slug,
    courseTitle: lesson.course.title,
    excerptRich: lesson.excerptRich ?? null,
    contentRich: lesson.contentRich,
    audioUrl: resolvePublicMediaUrl(lesson.audioUrl),
    audioChunks: lesson.audioChunks ?? null,
    updatedAt: lesson.updatedAt.toISOString(),
  };
};

const isNotFoundError = (error: unknown): boolean => {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
};

const isUniqueError = (error: unknown): boolean => {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
};

const isRelationError = (error: unknown): boolean => {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003";
};

export const lessonsService = {
  async list(query: ListLessonsQuery, pagination: PaginationParams) {
    const [lessons, total] = await Promise.all([
      lessonsRepository.list(query, pagination),
      lessonsRepository.count(query),
    ]);

    return {
      items: lessons.map(toLessonDto),
      total,
    };
  },
  async getById(id: string) {
    const lesson = await lessonsRepository.getById(id);

    if (!lesson) {
      throw new ApiError(404, "NOT_FOUND", "Lesson not found");
    }

    return toLessonDetailDto(lesson as LessonDetailRecord);
  },
  async getPreviewById(id: string) {
    const lesson = await lessonsRepository.getById(id);

    if (!lesson) {
      throw new ApiError(404, "NOT_FOUND", "Lesson not found");
    }

    return toPublicLessonPreviewDto(lesson as LessonDetailRecord);
  },
  async create(input: CreateLessonInput) {
    const normalizedInput: CreateLessonPersistInput = {
      ...input,
      slug: ensureSlug(input.slug),
      ...toCreateExcerptPersist(input),
    };

    try {
      const lesson = await lessonsRepository.create(normalizedInput);
      return toLessonDto(lesson);
    } catch (error) {
      if (isUniqueError(error)) {
        throw new ApiError(
          409,
          "CONFLICT",
          "Lesson slug already exists in this course",
          createCmsDomainErrorDetails("LESSON_SLUG_EXISTS_IN_COURSE"),
        );
      }

      if (isRelationError(error)) {
        throw new ApiError(
          400,
          "VALIDATION_ERROR",
          "Lesson references an invalid course",
          createCmsDomainErrorDetails("LESSON_INVALID_RELATIONS"),
        );
      }

      throw error;
    }
  },
  async update(id: string, input: UpdateLessonInput) {
    const current = await lessonsRepository.getById(id);

    if (!current) {
      throw new ApiError(404, "NOT_FOUND", "Lesson not found");
    }

    const normalizedInput: UpdateLessonPersistInput = {
      ...input,
      slug: input.slug ? ensureSlug(input.slug) : undefined,
      ...toUpdateExcerptPersist(input),
    };

    const nextStatus = normalizedInput.status ?? current.status;
    const nextPublishedAt =
      normalizedInput.publishedAt === undefined ? current.publishedAt : normalizedInput.publishedAt;

    assertPublishedAtConsistency(nextStatus, nextPublishedAt ?? null);

    try {
      const lesson = await lessonsRepository.update(id, normalizedInput);
      return toLessonDto(lesson);
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new ApiError(404, "NOT_FOUND", "Lesson not found");
      }

      if (isUniqueError(error)) {
        throw new ApiError(
          409,
          "CONFLICT",
          "Lesson slug already exists in this course",
          createCmsDomainErrorDetails("LESSON_SLUG_EXISTS_IN_COURSE"),
        );
      }

      if (isRelationError(error)) {
        throw new ApiError(
          400,
          "VALIDATION_ERROR",
          "Lesson references an invalid course",
          createCmsDomainErrorDetails("LESSON_INVALID_RELATIONS"),
        );
      }

      throw error;
    }
  },
  async delete(id: string) {
    try {
      await lessonsRepository.delete(id);
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new ApiError(404, "NOT_FOUND", "Lesson not found");
      }

      throw error;
    }
  },
  async reorder(input: ReorderLessonsInput) {
    const current = await lessonsRepository.listIdsByCourse(input.courseId);

    if (current.length === 0) {
      throw new ApiError(404, "NOT_FOUND", "No lessons found for reorder");
    }

    const currentIds = current.map((lesson) => lesson.id);
    const expected = new Set(currentIds);
    const received = new Set(input.orderedLessonIds);

    const sameLength = input.orderedLessonIds.length === currentIds.length;
    const sameElements =
      sameLength &&
      currentIds.every((id) => received.has(id)) &&
      input.orderedLessonIds.every((id) => expected.has(id));

    if (!sameElements) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "orderedLessonIds must include all and only the course lessons",
        createCmsDomainErrorDetails("COURSE_LESSON_ORDER_MISMATCH"),
      );
    }

    const reordered = await lessonsRepository.reorderWithinCourse(input);

    return reordered.map(toLessonDto);
  },
  async publish(id: string) {
    const current = await lessonsRepository.getById(id);

    if (!current) {
      throw new ApiError(404, "NOT_FOUND", "Lesson not found");
    }

    if (current.status === "PUBLISHED" && current.publishedAt) {
      return toLessonDto(current);
    }

    try {
      const lesson = await lessonsRepository.publish(id);
      return toLessonDto(lesson);
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new ApiError(404, "NOT_FOUND", "Lesson not found");
      }

      throw error;
    }
  },
  async unpublish(id: string) {
    const current = await lessonsRepository.getById(id);

    if (!current) {
      throw new ApiError(404, "NOT_FOUND", "Lesson not found");
    }

    if (current.status === "DRAFT" && current.publishedAt === null) {
      return toLessonDto(current);
    }

    try {
      const lesson = await lessonsRepository.unpublish(id);
      return toLessonDto(lesson);
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new ApiError(404, "NOT_FOUND", "Lesson not found");
      }

      throw error;
    }
  },
  async archive(id: string) {
    const current = await lessonsRepository.getById(id);

    if (!current) {
      throw new ApiError(404, "NOT_FOUND", "Lesson not found");
    }

    if (current.status === "ARCHIVED" && current.publishedAt === null) {
      return toLessonDto(current);
    }

    try {
      const lesson = await lessonsRepository.archive(id);
      return toLessonDto(lesson);
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new ApiError(404, "NOT_FOUND", "Lesson not found");
      }

      throw error;
    }
  },
};
