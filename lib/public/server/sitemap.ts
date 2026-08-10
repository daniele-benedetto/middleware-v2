import "server-only";

import { prisma } from "@/lib/prisma";
import {
  PUBLIC_STATIC_PAGE_SLUGS,
  getPublicStaticPagePath,
  isPublicStaticPageSlug,
} from "@/lib/public/pages/static-pages";

export const PUBLIC_SITEMAP_CACHE_TAG = "public-sitemap";

export type SitemapEntry = {
  path: string;
  lastModified?: Date;
};

export type PublicSitemapData = {
  homeLastModified?: Date;
  articles: SitemapEntry[];
  issues: SitemapEntry[];
  courses: SitemapEntry[];
  lessons: SitemapEntry[];
  staticPages: SitemapEntry[];
};

const PUBLISHED_ISSUE_FILTER = {
  isActive: true,
  publishedAt: { not: null },
} as const;

function toLastModified(
  updatedAt: Date | null | undefined,
  publishedAt: Date | null | undefined,
): Date | undefined {
  return updatedAt ?? publishedAt ?? undefined;
}

async function getHomeLastModified() {
  const currentIssue = await prisma.issue.findFirst({
    where: PUBLISHED_ISSUE_FILTER,
    orderBy: { publishedAt: "desc" },
    select: { publishedAt: true, updatedAt: true },
  });

  return toLastModified(currentIssue?.updatedAt, currentIssue?.publishedAt);
}

async function getArticleEntries(): Promise<SitemapEntry[]> {
  const articles = await prisma.article.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { not: null },
      issue: PUBLISHED_ISSUE_FILTER,
    },
    orderBy: { publishedAt: "desc" },
    select: { slug: true, publishedAt: true, updatedAt: true },
  });

  return articles.map((article) => ({
    path: `/articoli/${article.slug}`,
    lastModified: toLastModified(article.updatedAt, article.publishedAt),
  }));
}

async function getIssueEntries(): Promise<SitemapEntry[]> {
  const issues = await prisma.issue.findMany({
    where: PUBLISHED_ISSUE_FILTER,
    orderBy: { publishedAt: "desc" },
    select: { slug: true, publishedAt: true, updatedAt: true },
  });

  return issues.map((issue) => ({
    path: `/uscite/${issue.slug}`,
    lastModified: toLastModified(issue.updatedAt, issue.publishedAt),
  }));
}

async function getCourseEntries(): Promise<SitemapEntry[]> {
  const courses = await prisma.course.findMany({
    where: PUBLISHED_ISSUE_FILTER,
    orderBy: { publishedAt: "desc" },
    select: { slug: true, publishedAt: true, updatedAt: true },
  });

  return courses.map((course) => ({
    path: `/contro-formazione/${course.slug}`,
    lastModified: toLastModified(course.updatedAt, course.publishedAt),
  }));
}

async function getLessonEntries(): Promise<SitemapEntry[]> {
  const lessons = await prisma.lesson.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { not: null },
      course: PUBLISHED_ISSUE_FILTER,
    },
    orderBy: { publishedAt: "desc" },
    select: {
      slug: true,
      publishedAt: true,
      updatedAt: true,
      course: { select: { slug: true } },
    },
  });

  return lessons.map((lesson) => ({
    path: `/contro-formazione/${lesson.course.slug}/${lesson.slug}`,
    lastModified: toLastModified(lesson.updatedAt, lesson.publishedAt),
  }));
}

async function getStaticPageEntries(): Promise<SitemapEntry[]> {
  const pages = await prisma.page.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { not: null },
      slug: { in: [...PUBLIC_STATIC_PAGE_SLUGS] },
    },
    orderBy: { publishedAt: "desc" },
    select: { slug: true, publishedAt: true, updatedAt: true },
  });

  return pages.flatMap((page) => {
    if (!isPublicStaticPageSlug(page.slug)) {
      return [];
    }

    return [
      {
        path: getPublicStaticPagePath(page.slug),
        lastModified: toLastModified(page.updatedAt, page.publishedAt),
      },
    ];
  });
}

async function resolveOrEmpty(
  label: string,
  load: () => Promise<SitemapEntry[]>,
): Promise<SitemapEntry[]> {
  try {
    return await load();
  } catch (error) {
    console.error(`sitemap ${label} failed`, error);
    return [];
  }
}

export async function getPublicSitemapData(): Promise<PublicSitemapData> {
  const [homeLastModified, articles, issues, courses, lessons, staticPages] = await Promise.all([
    getHomeLastModified().catch((error) => {
      console.error("sitemap home lastModified failed", error);
      return undefined;
    }),
    resolveOrEmpty("published articles", getArticleEntries),
    resolveOrEmpty("published issues", getIssueEntries),
    resolveOrEmpty("published courses", getCourseEntries),
    resolveOrEmpty("published lessons", getLessonEntries),
    resolveOrEmpty("published static pages", getStaticPageEntries),
  ]);

  return { homeLastModified, articles, issues, courses, lessons, staticPages };
}
