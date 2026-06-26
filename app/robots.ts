import { getSitemapUrl } from "@/lib/seo";

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/api/public/media/blob"],
        disallow: ["/cms", "/cms/", "/api/"],
      },
    ],
    sitemap: getSitemapUrl(),
  };
}
