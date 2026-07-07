import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import type { PaginationParams } from "@/lib/server/http/pagination";
import type {
  ListCoursesQuery,
  ReorderCoursesInput,
  UpdateCourseInput,
} from "@/lib/server/modules/courses/schema";

export type CreateCoursePersistInput = {
  title: string;
  titleStyled?: unknown;
  slug: string;
  description?: unknown;
  homeVariant?: string;
  isActive?: boolean;
  publishedAt?: Date | null;
};

const COURSE_LIST_SELECT = {
  id: true,
  title: true,
  titleStyled: true,
  slug: true,
  description: true,
  homeVariant: true,
  isActive: true,
  sortOrder: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      lessons: true,
    },
  },
} as const satisfies Prisma.CourseSelect;

const COURSE_DETAIL_SELECT = {
  ...COURSE_LIST_SELECT,
  lessons: {
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      sortOrder: true,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  },
} as const satisfies Prisma.CourseSelect;

const toCourseWhereInput = (query: ListCoursesQuery): Prisma.CourseWhereInput => {
  const publishedAtFilter =
    query.published === undefined ? undefined : query.published ? { not: null } : null;

  return {
    isActive: query.isActive,
    publishedAt: publishedAtFilter,
    OR: query.q
      ? [
          { title: { contains: query.q, mode: "insensitive" } },
          { slug: { contains: query.q, mode: "insensitive" } },
        ]
      : undefined,
  };
};

const toCourseOrderByInput = (query: ListCoursesQuery): Prisma.CourseOrderByWithRelationInput => {
  return { [query.sortBy]: query.sortOrder };
};

export const coursesRepository = {
  async list(query: ListCoursesQuery, pagination: PaginationParams) {
    const where = toCourseWhereInput(query);
    const orderBy = toCourseOrderByInput(query);

    return prisma.course.findMany({
      where,
      orderBy,
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      select: COURSE_LIST_SELECT,
    });
  },
  async count(query: ListCoursesQuery) {
    const where = toCourseWhereInput(query);
    return prisma.course.count({ where });
  },
  async getById(id: string) {
    return prisma.course.findUnique({
      where: { id },
      select: COURSE_DETAIL_SELECT,
    });
  },
  async getPreviewById(id: string) {
    return prisma.course.findUnique({
      where: { id },
      select: {
        ...COURSE_LIST_SELECT,
        lessons: {
          select: {
            id: true,
            slug: true,
            title: true,
            titleStyled: true,
            excerpt: true,
            imageUrl: true,
            imageAlt: true,
            audioUrl: true,
            sortOrder: true,
            contentRich: true,
            publishedAt: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    });
  },
  async create(input: CreateCoursePersistInput) {
    const data: Prisma.CourseUncheckedCreateInput = {
      title: input.title,
      titleStyled:
        input.titleStyled === undefined ? undefined : (input.titleStyled as Prisma.InputJsonValue),
      slug: input.slug,
      description:
        input.description === undefined ? undefined : (input.description as Prisma.InputJsonValue),
      homeVariant: input.homeVariant,
      isActive: input.isActive,
      publishedAt: input.publishedAt ?? null,
    };

    return prisma.course.create({ data });
  },
  async update(id: string, input: UpdateCourseInput) {
    const data: Prisma.CourseUncheckedUpdateInput = {
      title: input.title,
      titleStyled:
        input.titleStyled === undefined
          ? undefined
          : input.titleStyled === null
            ? Prisma.JsonNull
            : (input.titleStyled as Prisma.InputJsonValue),
      slug: input.slug,
      description:
        input.description === undefined
          ? undefined
          : input.description === null
            ? Prisma.JsonNull
            : (input.description as Prisma.InputJsonValue),
      homeVariant: input.homeVariant,
      isActive: input.isActive,
      publishedAt: input.publishedAt,
    };

    return prisma.course.update({
      where: { id },
      data,
    });
  },
  async delete(id: string) {
    return prisma.course.delete({
      where: { id },
    });
  },
  async listIdsOrderedBySortOrder() {
    return prisma.course.findMany({
      select: {
        id: true,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  },
  async reorder(input: ReorderCoursesInput) {
    return prisma.$transaction(async (tx) => {
      for (const [index, courseId] of input.orderedCourseIds.entries()) {
        await tx.course.update({
          where: { id: courseId },
          data: {
            sortOrder: index,
          },
        });
      }

      return tx.course.findMany({
        select: COURSE_LIST_SELECT,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
    });
  },
};
