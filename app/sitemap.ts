import { connection } from "next/server";

import { getPublicSitemapData, type SitemapEntry } from "@/lib/public/server/sitemap";
import { getCanonicalUrl } from "@/lib/seo";

import type { MetadataRoute } from "next";

type SitemapItem = MetadataRoute.Sitemap[number];

function toSitemapItems(
  entries: SitemapEntry[],
  changeFrequency: SitemapItem["changeFrequency"],
  priority: number,
): MetadataRoute.Sitemap {
  return entries.map((entry) => ({
    url: getCanonicalUrl(entry.path),
    lastModified: entry.lastModified,
    changeFrequency,
    priority,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();

  const { homeLastModified, articles, issues, courses, lessons, staticPages } =
    await getPublicSitemapData();

  const indexPaths = ["/", "/uscite", "/articoli", "/contro-formazione"];

  return [
    ...indexPaths.map((path, index) => ({
      url: getCanonicalUrl(path),
      lastModified: homeLastModified,
      changeFrequency: "weekly" as const,
      priority: index === 0 ? 1 : 0.8,
    })),
    ...toSitemapItems(issues, "monthly", 0.7),
    ...toSitemapItems(articles, "monthly", 0.7),
    ...toSitemapItems(courses, "monthly", 0.7),
    ...toSitemapItems(lessons, "monthly", 0.6),
    ...toSitemapItems(staticPages, "monthly", 0.6),
  ];
}
