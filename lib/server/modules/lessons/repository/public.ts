import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const PUBLIC_COURSE_WHERE = {
  isActive: true,
  publishedAt: { not: null },
} as const satisfies Prisma.CourseWhereInput;

const PUBLIC_LESSON_WHERE = {
  status: "PUBLISHED",
  publishedAt: { not: null },
  course: PUBLIC_COURSE_WHERE,
} as const satisfies Prisma.LessonWhereInput;

const PUBLIC_LESSON_SUMMARY_SELECT = {
  id: true,
  slug: true,
  title: true,
  titleStyled: true,
  excerpt: true,
  imageUrl: true,
  imageAlt: true,
  audioUrl: true,
  sortOrder: true,
  publishedAt: true,
  courseId: true,
  course: {
    select: { slug: true, title: true },
  },
} as const satisfies Prisma.LessonSelect;

const PUBLIC_LESSON_DETAIL_SELECT = {
  ...PUBLIC_LESSON_SUMMARY_SELECT,
  updatedAt: true,
  excerptRich: true,
  contentRich: true,
  audioChunks: true,
} as const satisfies Prisma.LessonSelect;

export const publicLessonsRepository = {
  async getBySlug(courseSlug: string, lessonSlug: string) {
    return prisma.lesson.findFirst({
      where: {
        ...PUBLIC_LESSON_WHERE,
        slug: lessonSlug,
        course: { ...PUBLIC_COURSE_WHERE, slug: courseSlug },
      },
      select: PUBLIC_LESSON_DETAIL_SELECT,
    });
  },
  async listByCourseSlug(courseSlug: string) {
    return prisma.lesson.findMany({
      where: {
        ...PUBLIC_LESSON_WHERE,
        course: { ...PUBLIC_COURSE_WHERE, slug: courseSlug },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: PUBLIC_LESSON_SUMMARY_SELECT,
    });
  },
  async listWithAudio() {
    return prisma.lesson.findMany({
      where: { ...PUBLIC_LESSON_WHERE, audioUrl: { not: null } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: PUBLIC_LESSON_SUMMARY_SELECT,
    });
  },
};
