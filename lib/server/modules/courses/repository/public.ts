import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import type { PaginationParams } from "@/lib/server/http/pagination";

const PUBLISHED_LESSON_WHERE = {
  status: "PUBLISHED",
  publishedAt: { not: null },
} as const satisfies Prisma.LessonWhereInput;

const PUBLIC_COURSE_LIST_SELECT = {
  id: true,
  title: true,
  titleStyled: true,
  slug: true,
  description: true,
  homeVariant: true,
  publishedAt: true,
  _count: {
    select: {
      lessons: { where: PUBLISHED_LESSON_WHERE },
    },
  },
} as const satisfies Prisma.CourseSelect;

const PUBLIC_COURSE_DETAIL_LESSON_SELECT = {
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
} as const satisfies Prisma.LessonSelect;

const PUBLIC_COURSE_DETAIL_SELECT = {
  ...PUBLIC_COURSE_LIST_SELECT,
  lessons: {
    where: PUBLISHED_LESSON_WHERE,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: PUBLIC_COURSE_DETAIL_LESSON_SELECT,
  },
} as const satisfies Prisma.CourseSelect;

const PUBLIC_COURSE_WHERE = {
  isActive: true,
  publishedAt: { not: null },
} as const satisfies Prisma.CourseWhereInput;

export const publicCoursesRepository = {
  async listPublished(pagination: PaginationParams) {
    return prisma.course.findMany({
      where: PUBLIC_COURSE_WHERE,
      orderBy: { publishedAt: "desc" },
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      select: PUBLIC_COURSE_LIST_SELECT,
    });
  },
  async countPublished() {
    return prisma.course.count({ where: PUBLIC_COURSE_WHERE });
  },
  async getBySlug(slug: string) {
    return prisma.course.findFirst({
      where: { ...PUBLIC_COURSE_WHERE, slug },
      select: PUBLIC_COURSE_DETAIL_SELECT,
    });
  },
};
