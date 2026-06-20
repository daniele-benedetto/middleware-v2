import { prisma } from "@/lib/prisma";
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
  return [
    {
      url: getCanonicalUrl("/"),
      lastModified: await getHomeLastModified(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
