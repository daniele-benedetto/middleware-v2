import { prisma } from "@/lib/prisma";
import { getCanonicalUrl } from "@/lib/seo";

import type { MetadataRoute } from "next";

type SitemapEntry = MetadataRoute.Sitemap[number];

const staticEntries: SitemapEntry[] = [
  {
    url: getCanonicalUrl("/"),
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    url: getCanonicalUrl("/uscite"),
    changeFrequency: "weekly",
    priority: 0.9,
  },
  {
    url: getCanonicalUrl("/archivio"),
    changeFrequency: "weekly",
    priority: 0.8,
  },
  {
    url: getCanonicalUrl("/categorie"),
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    url: getCanonicalUrl("/tag"),
    changeFrequency: "monthly",
    priority: 0.5,
  },
  {
    url: getCanonicalUrl("/podcast"),
    changeFrequency: "weekly",
    priority: 0.7,
  },
];

function getPagePriority(slug: string): number {
  if (slug === "chi-siamo") return 0.7;
  if (slug === "privacy-policy" || slug === "cookie-policy") return 0.2;
  return 0.5;
}

function getPageChangeFrequency(slug: string): SitemapEntry["changeFrequency"] {
  if (slug === "privacy-policy" || slug === "cookie-policy") return "yearly";
  return "monthly";
}

async function getPublicSitemapData() {
  try {
    const publicArticleWhere = {
      status: "PUBLISHED" as const,
      publishedAt: { not: null },
      issue: { isActive: true, publishedAt: { not: null } },
    };

    const [issues, articles, categories, tags, pages] = await Promise.all([
      prisma.issue.findMany({
        where: { isActive: true, publishedAt: { not: null } },
        orderBy: { publishedAt: "desc" },
        select: { slug: true, publishedAt: true },
      }),
      prisma.article.findMany({
        where: publicArticleWhere,
        orderBy: { publishedAt: "desc" },
        select: { slug: true, publishedAt: true, isFeatured: true },
      }),
      prisma.category.findMany({
        where: { isActive: true, articles: { some: publicArticleWhere } },
        orderBy: { name: "asc" },
        select: { slug: true },
      }),
      prisma.tag.findMany({
        where: { isActive: true, articles: { some: { article: publicArticleWhere } } },
        orderBy: { name: "asc" },
        select: { slug: true },
      }),
      prisma.page.findMany({
        where: { status: "PUBLISHED", publishedAt: { not: null } },
        orderBy: { publishedAt: "desc" },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    return { issues, articles, categories, tags, pages };
  } catch (error) {
    console.error("sitemap public data failed", error);
    return { issues: [], articles: [], categories: [], tags: [], pages: [] };
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const publicData = await getPublicSitemapData();

  const issueEntries = publicData.issues.flatMap((issue) => {
    if (!issue.publishedAt) return [];

    return [
      {
        url: getCanonicalUrl(`/uscite/${issue.slug}`),
        lastModified: new Date(issue.publishedAt),
        changeFrequency: "monthly" as const,
        priority: 0.8,
      },
    ];
  });

  const articleEntries = publicData.articles.flatMap((article) => {
    if (!article.publishedAt) return [];

    return [
      {
        url: getCanonicalUrl(`/articoli/${article.slug}`),
        lastModified: new Date(article.publishedAt),
        changeFrequency: "monthly" as const,
        priority: article.isFeatured ? 0.8 : 0.7,
      },
    ];
  });

  const categoryEntries = publicData.categories.map((category) => ({
    url: getCanonicalUrl(`/categorie/${category.slug}`),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const tagEntries = publicData.tags.map((tag) => ({
    url: getCanonicalUrl(`/tag/${tag.slug}`),
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  const pageEntries = publicData.pages.map((page) => ({
    url: getCanonicalUrl(`/${page.slug}`),
    lastModified: new Date(page.updatedAt),
    changeFrequency: getPageChangeFrequency(page.slug),
    priority: getPagePriority(page.slug),
  }));

  return [
    ...staticEntries,
    ...issueEntries,
    ...articleEntries,
    ...categoryEntries,
    ...tagEntries,
    ...pageEntries,
  ];
}
