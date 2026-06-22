import { getIssuePlainDescription } from "@/components/public/home/home-view-model";
import { getCanonicalUrl, seoConfig } from "@/lib/seo";

import type { PublicCurrentIssueDetail } from "@/lib/public/server/current-issue-detail";

export function buildHomeJsonLd(currentIssue: PublicCurrentIssueDetail | null, path = "/") {
  const siteUrl = getCanonicalUrl(path);
  const rootUrl = getCanonicalUrl("/");
  const website = {
    "@type": "WebSite",
    "@id": `${rootUrl}#website`,
    name: seoConfig.siteName,
    url: rootUrl,
    inLanguage: "it-IT",
  };

  if (!currentIssue) {
    return { "@context": "https://schema.org", "@graph": [website] };
  }

  return {
    "@context": "https://schema.org",
    "@graph": [
      website,
      {
        "@type": "CollectionPage",
        "@id": `${siteUrl}#issue`,
        name: currentIssue.title,
        description: getIssuePlainDescription(currentIssue),
        url: siteUrl,
        isPartOf: { "@id": `${rootUrl}#website` },
        datePublished: currentIssue.publishedAt,
        hasPart: currentIssue.articles.map((article, index) => ({
          "@type": "Article",
          headline: article.title,
          description: article.excerpt ?? undefined,
          image: article.imageUrl
            ? {
                "@type": "ImageObject",
                url: article.imageUrl,
                description: article.imageAlt ?? undefined,
              }
            : undefined,
          author: article.authorName
            ? { "@type": "Organization", name: article.authorName }
            : undefined,
          datePublished: article.publishedAt,
          position: index + 1,
        })),
      },
    ],
  };
}
