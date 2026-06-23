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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const homeLastModified = await getHomeLastModified();
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
    ...staticPages,
  ];
}
