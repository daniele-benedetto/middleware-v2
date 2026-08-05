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

const MEDIA_BLOB_ROUTES = ["/api/cms/media/blob", "/api/public/media/blob"] as const;
const MEDIA_URL_ORIGINS = [
  "https://middleware.media",
  "https://www.middleware.media",
  "http://localhost:3000",
] as const;

function getCanonicalMediaReferences(pathname: string) {
  const encodedPathnames = [
    encodeURIComponent(pathname),
    new URLSearchParams({ pathname }).toString().slice("pathname=".length),
  ];

  const routeReferences = MEDIA_BLOB_ROUTES.flatMap((route) =>
    [pathname, ...encodedPathnames].flatMap((candidate) => [
      `${route}?pathname=${candidate}`,
      `${route}?pathname=${candidate}&download=1`,
    ]),
  );

  return [
    ...new Set([
      pathname,
      `/${pathname}`,
      ...encodedPathnames,
      ...routeReferences,
      ...MEDIA_URL_ORIGINS.flatMap((origin) =>
        routeReferences.map((reference) => `${origin}${reference}`),
      ),
    ]),
  ];
}

export const publicMediaRepository = {
  async hasPublishedArticleMedia(pathname: string) {
    const references = getCanonicalMediaReferences(pathname);
    const article = await prisma.article.findFirst({
      where: {
        ...PUBLIC_ARTICLE_MEDIA_WHERE,
        OR: [{ imageUrl: { in: references } }, { audioUrl: { in: references } }],
      },
      select: { id: true },
    });

    if (article) {
      return true;
    }

    const richTextResults = await Promise.all(
      references.map(
        (reference) =>
          prisma.$queryRaw<Array<{ id: string }>>`
          SELECT a."id"
          FROM "articles" a
          INNER JOIN "issues" i ON i."id" = a."issueId"
          WHERE a."status" = 'PUBLISHED'
            AND a."publishedAt" IS NOT NULL
            AND i."isActive" = true
            AND i."publishedAt" IS NOT NULL
            AND (
              jsonb_path_exists(
                a."contentRich",
                'lax $.**.attrs.src ? (@ == $reference)',
                jsonb_build_object('reference', to_jsonb(${reference}::text))
              )
              OR jsonb_path_exists(
                a."contentRich",
                'lax $.**.attrs.href ? (@ == $reference)',
                jsonb_build_object('reference', to_jsonb(${reference}::text))
              )
            )
          LIMIT 1
        `,
      ),
    );

    return richTextResults.some((rows) => rows.length > 0);
  },
  async hasPublishedLessonMedia(pathname: string) {
    const references = getCanonicalMediaReferences(pathname);
    const lesson = await prisma.lesson.findFirst({
      where: {
        ...PUBLIC_LESSON_MEDIA_WHERE,
        OR: [{ imageUrl: { in: references } }, { audioUrl: { in: references } }],
      },
      select: { id: true },
    });

    if (lesson) {
      return true;
    }

    const richTextResults = await Promise.all(
      references.map(
        (reference) =>
          prisma.$queryRaw<Array<{ id: string }>>`
          SELECT l."id"
          FROM "lessons" l
          INNER JOIN "courses" c ON c."id" = l."courseId"
          WHERE l."status" = 'PUBLISHED'
            AND l."publishedAt" IS NOT NULL
            AND c."isActive" = true
            AND c."publishedAt" IS NOT NULL
            AND (
              jsonb_path_exists(
                l."contentRich",
                'lax $.**.attrs.src ? (@ == $reference)',
                jsonb_build_object('reference', to_jsonb(${reference}::text))
              )
              OR jsonb_path_exists(
                l."contentRich",
                'lax $.**.attrs.href ? (@ == $reference)',
                jsonb_build_object('reference', to_jsonb(${reference}::text))
              )
            )
          LIMIT 1
        `,
      ),
    );

    return richTextResults.some((rows) => rows.length > 0);
  },
  async hasPublishedPageImage(pathname: string) {
    const references = getCanonicalMediaReferences(pathname);
    const results = await Promise.all(
      references.map(
        (reference) =>
          prisma.$queryRaw<Array<{ id: string }>>`
          SELECT "id"
          FROM "pages"
          WHERE "status" = 'PUBLISHED'
            AND "publishedAt" IS NOT NULL
            AND (
              jsonb_path_exists(
                "contentRich",
                'lax $.**.attrs.src ? (@ == $reference)',
                jsonb_build_object('reference', to_jsonb(${reference}::text))
              )
              OR jsonb_path_exists(
                "contentRich",
                'lax $.**.attrs.href ? (@ == $reference)',
                jsonb_build_object('reference', to_jsonb(${reference}::text))
              )
            )
          LIMIT 1
        `,
      ),
    );

    return results.some((rows) => rows.length > 0);
  },
};
