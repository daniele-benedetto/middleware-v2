import { prisma } from "@/lib/prisma";
import { PUBLIC_STATIC_PAGE_SLUGS, getPublicStaticPagePath } from "@/lib/public/pages/static-pages";
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [homeLastModified, articlePages, issuePages] = await Promise.all([
    getHomeLastModified(),
    getPublishedArticlePages(),
    getPublishedIssuePages(),
  ]);
  const staticPages = PUBLIC_STATIC_PAGE_SLUGS.map((slug) => ({
    url: getCanonicalUrl(getPublicStaticPagePath(slug)),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

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
