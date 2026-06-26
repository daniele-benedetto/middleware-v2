import { prisma } from "@/lib/prisma";
import {
  PUBLIC_STATIC_PAGE_SLUGS,
  getPublicStaticPagePath,
  isPublicStaticPageSlug,
} from "@/lib/public/pages/static-pages";
import { getCanonicalUrl } from "@/lib/seo";

import type { MetadataRoute } from "next";

async function getHomeLastModified() {
  try {
    const currentIssue = await prisma.issue.findFirst({
      where: { isActive: true, publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      select: { publishedAt: true, updatedAt: true },
    });

    return currentIssue?.updatedAt ?? currentIssue?.publishedAt ?? undefined;
  } catch (error) {
    console.error("sitemap home lastModified failed", error);
    return undefined;
  }
}

async function getPublishedArticlePages() {
  try {
    const articles = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { not: null },
        issue: {
          isActive: true,
          publishedAt: { not: null },
        },
      },
      orderBy: { publishedAt: "desc" },
      select: { slug: true, publishedAt: true, updatedAt: true },
    });

    return articles.map((article) => ({
      url: getCanonicalUrl(`/articoli/${article.slug}`),
      lastModified: article.updatedAt ?? article.publishedAt ?? undefined,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));
  } catch (error) {
    console.error("sitemap published articles failed", error);
    return [];
  }
}

async function getPublishedIssuePages() {
  try {
    const issues = await prisma.issue.findMany({
      where: { isActive: true, publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      select: { slug: true, publishedAt: true, updatedAt: true },
    });

    return issues.map((issue) => ({
      url: getCanonicalUrl(`/uscite/${issue.slug}`),
      lastModified: issue.updatedAt ?? issue.publishedAt ?? undefined,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));
  } catch (error) {
    console.error("sitemap published issues failed", error);
    return [];
  }
}

async function getPublishedStaticPages() {
  try {
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
          url: getCanonicalUrl(getPublicStaticPagePath(page.slug)),
          lastModified: page.updatedAt ?? page.publishedAt ?? undefined,
          changeFrequency: "monthly" as const,
          priority: 0.6,
        },
      ];
    });
  } catch (error) {
    console.error("sitemap published static pages failed", error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [homeLastModified, articlePages, issuePages, staticPages] = await Promise.all([
    getHomeLastModified(),
    getPublishedArticlePages(),
    getPublishedIssuePages(),
    getPublishedStaticPages(),
  ]);

  return [
    {
      url: getCanonicalUrl("/"),
      lastModified: homeLastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: getCanonicalUrl("/uscite"),
      lastModified: homeLastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...issuePages,
    ...articlePages,
    ...staticPages,
  ];
}
