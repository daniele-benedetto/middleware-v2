import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const PUBLIC_ISSUE_WHERE = {
  isActive: true,
  publishedAt: { not: null },
} as const satisfies Prisma.IssueWhereInput;

const PUBLIC_ARTICLE_MEDIA_WHERE = {
  status: "PUBLISHED",
  publishedAt: { not: null },
  issue: PUBLIC_ISSUE_WHERE,
} as const satisfies Prisma.ArticleWhereInput;

const PUBLIC_COURSE_WHERE = {
  isActive: true,
  publishedAt: { not: null },
} as const satisfies Prisma.CourseWhereInput;

const PUBLIC_LESSON_MEDIA_WHERE = {
  status: "PUBLISHED",
  publishedAt: { not: null },
  course: PUBLIC_COURSE_WHERE,
} as const satisfies Prisma.LessonWhereInput;

function getPathnameSearchCandidates(pathname: string) {
  return [...new Set([pathname, encodeURIComponent(pathname)])];
}

export const publicMediaRepository = {
  async hasPublishedArticleMedia(pathname: string) {
    const candidates = getPathnameSearchCandidates(pathname);
    const article = await prisma.article.findFirst({
      where: {
        ...PUBLIC_ARTICLE_MEDIA_WHERE,
        OR: candidates.flatMap((candidate) => [
          { imageUrl: { contains: candidate } },
          { audioUrl: { contains: candidate } },
        ]),
      },
      select: { id: true },
    });

    if (article) {
      return true;
    }

    const richTextResults = await Promise.all(
      candidates.map(
        (candidate) =>
          prisma.$queryRaw<Array<{ id: string }>>`
          SELECT a."id"
          FROM "articles" a
          INNER JOIN "issues" i ON i."id" = a."issueId"
          WHERE a."status" = 'PUBLISHED'
            AND a."publishedAt" IS NOT NULL
            AND i."isActive" = true
            AND i."publishedAt" IS NOT NULL
            AND a."contentRich"::text LIKE ${`%${candidate}%`}
          LIMIT 1
        `,
      ),
    );

    return richTextResults.some((rows) => rows.length > 0);
  },
  async hasPublishedLessonMedia(pathname: string) {
    const candidates = getPathnameSearchCandidates(pathname);
    const lesson = await prisma.lesson.findFirst({
      where: {
        ...PUBLIC_LESSON_MEDIA_WHERE,
        OR: candidates.flatMap((candidate) => [
          { imageUrl: { contains: candidate } },
          { audioUrl: { contains: candidate } },
        ]),
      },
      select: { id: true },
    });

    if (lesson) {
      return true;
    }

    const richTextResults = await Promise.all(
      candidates.map(
        (candidate) =>
          prisma.$queryRaw<Array<{ id: string }>>`
          SELECT l."id"
          FROM "lessons" l
          INNER JOIN "courses" c ON c."id" = l."courseId"
          WHERE l."status" = 'PUBLISHED'
            AND l."publishedAt" IS NOT NULL
            AND c."isActive" = true
            AND c."publishedAt" IS NOT NULL
            AND l."contentRich"::text LIKE ${`%${candidate}%`}
          LIMIT 1
        `,
      ),
    );

    return richTextResults.some((rows) => rows.length > 0);
  },
  async hasPublishedPageImage(pathname: string) {
    const candidates = getPathnameSearchCandidates(pathname);
    const results = await Promise.all(
      candidates.map(
        (candidate) =>
          prisma.$queryRaw<Array<{ id: string }>>`
          SELECT "id"
          FROM "pages"
          WHERE "status" = 'PUBLISHED'
            AND "publishedAt" IS NOT NULL
            AND "contentRich"::text LIKE ${`%${candidate}%`}
          LIMIT 1
        `,
      ),
    );

    return results.some((rows) => rows.length > 0);
  },
};
