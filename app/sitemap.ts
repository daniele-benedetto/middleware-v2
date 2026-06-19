import { getPublishedIssues } from "@/lib/public/server/issues";
import { getCanonicalUrl } from "@/lib/seo";

import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const issues = await getPublishedIssues();

  const issueEntries = issues.map((issue) => ({
    url: getCanonicalUrl(`/numeri/${issue.slug}`),
    lastModified: new Date(issue.publishedAt),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [
    {
      url: getCanonicalUrl("/"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: getCanonicalUrl("/numeri"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...issueEntries,
  ];
}
