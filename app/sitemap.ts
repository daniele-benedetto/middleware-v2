import { connection } from "next/server";

import { getPublicSitemapData, type SitemapEntry } from "@/lib/public/server/sitemap";
import { getCanonicalUrl } from "@/lib/seo";

import type { MetadataRoute } from "next";

function toSitemapItems(entries: SitemapEntry[]): MetadataRoute.Sitemap {
  return entries.map((entry) => ({
    url: getCanonicalUrl(entry.path),
    lastModified: entry.lastModified,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();

  const {
    homeLastModified,
    articlesArchiveLastModified,
    issuesArchiveLastModified,
    coursesArchiveLastModified,
    articles,
    issues,
    courses,
    lessons,
    staticPages,
  } = await getPublicSitemapData();

  const indexEntries: SitemapEntry[] = [
    { path: "/", lastModified: homeLastModified },
    { path: "/uscite", lastModified: issuesArchiveLastModified },
    { path: "/articoli", lastModified: articlesArchiveLastModified },
    { path: "/contro-formazione", lastModified: coursesArchiveLastModified },
  ];

  return toSitemapItems([
    ...indexEntries,
    ...issues,
    ...articles,
    ...courses,
    ...lessons,
    ...staticPages,
  ]);
}
