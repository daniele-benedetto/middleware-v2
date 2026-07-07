import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import type { PaginationParams } from "@/lib/server/http/pagination";
import type {
  ListLessonsQuery,
  ReorderLessonsInput,
  UpdateLessonInput,
} from "@/lib/server/modules/lessons/schema";

export type CreateLessonPersistInput = {
  courseId: string;
  title: string;
  titleStyled?: unknown;
  slug: string;
  excerpt?: string;
  excerptRich?: unknown;
  contentRich: unknown;
  imageUrl?: string;
  imageAlt?: string;
  audioUrl?: string;
  audioChunks?: unknown;
};

export type UpdateLessonPersistInput = UpdateLessonInput & {
  excerpt?: string | null;
  excerptRich?: unknown | null;
};

const LESSON_DETAIL_SELECT = {
  id: true,
  courseId: true,
  title: true,
  titleStyled: true,
  slug: true,
  status: true,
  sortOrder: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  excerpt: true,
  excerptRich: true,
  contentRich: true,
  imageUrl: true,
  imageAlt: true,
  audioUrl: true,
  audioChunks: true,
  course: {
    select: {
      slug: true,
      title: true,
    },
  },
} as const satisfies Prisma.LessonSelect;

const toLessonWhereInput = (query: ListLessonsQuery): Prisma.LessonWhereInput => {
  return {
    status: query.status,
    courseId: query.courseId,
    OR: query.q
      ? [
          { title: { contains: query.q, mode: "insensitive" } },
          { excerpt: { contains: query.q, mode: "insensitive" } },
        ]
      : undefined,
  };
};

const toLessonOrderByInput = (query: ListLessonsQuery): Prisma.LessonOrderByWithRelationInput => {
  return { [query.sortBy]: query.sortOrder };
};

export const lessonsRepository = {
  async list(query: ListLessonsQuery, pagination: PaginationParams) {
    const where = toLessonWhereInput(query);
    const orderBy = toLessonOrderByInput(query);

    return prisma.lesson.findMany({
      where,
      orderBy,
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      select: {
        id: true,
        courseId: true,
        title: true,
        titleStyled: true,
        slug: true,
        status: true,
        sortOrder: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        course: {
          select: {
            title: true,
          },
        },
      },
    });
  },
  async count(query: ListLessonsQuery) {
    const where = toLessonWhereInput(query);
    return prisma.lesson.count({ where });
  },
  async getById(id: string) {
    return prisma.lesson.findUnique({
      where: { id },
      select: LESSON_DETAIL_SELECT,
    });
  },
  async create(input: CreateLessonPersistInput) {
    return prisma.$transaction(async (tx) => {
      const lessonsInCourse = await tx.lesson.count({
        where: { courseId: input.courseId },
      });

      const data: Prisma.LessonUncheckedCreateInput = {
        courseId: input.courseId,
        title: input.title,
        titleStyled:
          input.titleStyled === undefined
            ? undefined
            : (input.titleStyled as Prisma.InputJsonValue),
        slug: input.slug,
        sortOrder: lessonsInCourse,
        excerpt: input.excerpt,
        excerptRich:
          input.excerptRich === undefined
            ? undefined
            : (input.excerptRich as Prisma.InputJsonValue),
        contentRich: input.contentRich as Prisma.InputJsonValue,
        imageUrl: input.imageUrl,
        imageAlt: input.imageAlt,
        audioUrl: input.audioUrl,
        audioChunks: input.audioChunks as Prisma.InputJsonValue | undefined,
      };

      const created = await tx.lesson.create({ data, select: { id: true } });

      const lesson = await tx.lesson.findUnique({
        where: { id: created.id },
        select: LESSON_DETAIL_SELECT,
      });

      if (!lesson) {
        throw new Prisma.PrismaClientKnownRequestError("Lesson not found", {
          code: "P2025",
          clientVersion: Prisma.prismaVersion.client,
        });
      }

      return lesson;
    });
  },
  async update(id: string, input: UpdateLessonPersistInput) {
    const data: Prisma.LessonUncheckedUpdateInput = {
      courseId: input.courseId,
      title: input.title,
      titleStyled:
        input.titleStyled === undefined
          ? undefined
          : input.titleStyled === null
            ? Prisma.JsonNull
            : (input.titleStyled as Prisma.InputJsonValue),
      slug: input.slug,
      excerpt: input.excerpt,
      excerptRich:
        input.excerptRich === undefined
          ? undefined
          : input.excerptRich === null
            ? Prisma.JsonNull
            : (input.excerptRich as Prisma.InputJsonValue),
      contentRich:
        input.contentRich === undefined ? undefined : (input.contentRich as Prisma.InputJsonValue),
      imageUrl: input.imageUrl,
      imageAlt: input.imageAlt,
      audioUrl: input.audioUrl,
      audioChunks:
        input.audioChunks === undefined
          ? undefined
          : input.audioChunks === null
            ? Prisma.JsonNull
            : (input.audioChunks as Prisma.InputJsonValue),
      status: input.status,
      publishedAt: input.publishedAt,
    };

    return prisma.lesson.update({
      where: { id },
      data,
      select: LESSON_DETAIL_SELECT,
    });
  },
  async delete(id: string) {
    return prisma.lesson.delete({
      where: { id },
    });
  },
  async listIdsByCourse(courseId: string) {
    return prisma.lesson.findMany({
      where: { courseId },
      select: { id: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  },
  async reorderWithinCourse(input: ReorderLessonsInput) {
    return prisma.$transaction(async (tx) => {
      for (const [index, lessonId] of input.orderedLessonIds.entries()) {
        await tx.lesson.update({
          where: { id: lessonId },
          data: {
            sortOrder: index,
          },
        });
      }

      return tx.lesson.findMany({
        where: { courseId: input.courseId },
        select: {
          id: true,
          courseId: true,
          title: true,
          titleStyled: true,
          slug: true,
          status: true,
          sortOrder: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          course: {
            select: {
              title: true,
            },
          },
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
    });
  },
  async publish(id: string) {
    return prisma.lesson.update({
      where: { id },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
      select: LESSON_DETAIL_SELECT,
    });
  },
  async unpublish(id: string) {
    return prisma.lesson.update({
      where: { id },
      data: {
        status: "DRAFT",
        publishedAt: null,
      },
      select: LESSON_DETAIL_SELECT,
    });
  },
  async archive(id: string) {
    return prisma.lesson.update({
      where: { id },
      data: {
        status: "ARCHIVED",
        publishedAt: null,
      },
      select: LESSON_DETAIL_SELECT,
    });
  },
  async listMediaReferences(urls: string[]) {
    if (urls.length === 0) {
      return [];
    }

    return prisma.lesson.findMany({
      where: {
        OR: [
          { imageUrl: { in: urls } },
          { audioUrl: { in: urls } },
          ...urls.map((url) => ({ audioChunks: { equals: url } })),
        ],
      },
      select: {
        id: true,
        title: true,
        imageUrl: true,
        audioUrl: true,
        audioChunks: true,
      },
    });
  },
  async replaceMediaUrl(currentUrl: string, nextUrl: string) {
    if (currentUrl === nextUrl) {
      return [];
    }

    return prisma.$transaction(async (tx) => {
      const impactedLessons = await tx.lesson.findMany({
        where: {
          OR: [
            { imageUrl: currentUrl },
            { audioUrl: currentUrl },
            { audioChunks: { equals: currentUrl } },
          ],
        },
        select: { id: true },
      });

      await Promise.all([
        tx.lesson.updateMany({
          where: { imageUrl: currentUrl },
          data: { imageUrl: nextUrl },
        }),
        tx.lesson.updateMany({
          where: { audioUrl: currentUrl },
          data: { audioUrl: nextUrl },
        }),
        tx.lesson.updateMany({
          where: { audioChunks: { equals: currentUrl } },
          data: { audioChunks: nextUrl },
        }),
      ]);

      return [...new Set(impactedLessons.map((lesson) => lesson.id))];
    });
  },
  async clearMediaUrl(url: string) {
    return prisma.$transaction(async (tx) => {
      const impactedLessons = await tx.lesson.findMany({
        where: {
          OR: [{ imageUrl: url }, { audioUrl: url }, { audioChunks: { equals: url } }],
        },
        select: { id: true },
      });

      await Promise.all([
        tx.lesson.updateMany({
          where: { imageUrl: url },
          data: { imageUrl: null },
        }),
        tx.lesson.updateMany({
          where: { audioUrl: url },
          data: { audioUrl: null },
        }),
        tx.lesson.updateMany({
          where: { audioChunks: { equals: url } },
          data: { audioChunks: Prisma.JsonNull },
        }),
      ]);

      return [...new Set(impactedLessons.map((lesson) => lesson.id))];
    });
  },
};
