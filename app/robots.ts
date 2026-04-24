import { getSitemapUrl } from "@/lib/seo";

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: ["/cms/", "/api/", "/_next/"],
      },
    ],
    sitemap: getSitemapUrl(),
  };
}
