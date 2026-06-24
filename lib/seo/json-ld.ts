import { getIssuePlainDescription } from "@/components/public/home/home-view-model";
import { seoConfig } from "@/lib/seo/config";
import { getCanonicalUrl, getOpenGraphImageUrl } from "@/lib/seo/metadata";
import { resolveAbsoluteUrl, toIsoDate } from "@/lib/seo/url";

import type { PublicCurrentIssueDetail } from "@/lib/public/types/issues";
import type { PublicArticleDetailDto } from "@/lib/server/modules/articles/dto/public";

type BreadcrumbItem = {
  name: string;
  path: string;
};

function getRootUrl() {
  return getCanonicalUrl("/");
}

export function buildWebsiteJsonLd() {
  const rootUrl = getRootUrl();

  return {
    "@type": "WebSite",
    "@id": `${rootUrl}#website`,
    name: seoConfig.siteName,
    url: rootUrl,
    inLanguage: "it-IT",
  };
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: getCanonicalUrl(item.path),
    })),
  };
}

export function buildArticleJsonLd(article: PublicArticleDetailDto, description?: string | null) {
  const articleUrl = getCanonicalUrl(`/articoli/${article.slug}`);
  const imageUrl = article.imageUrl ? resolveAbsoluteUrl(article.imageUrl) : getOpenGraphImageUrl();

  return {
    "@type": "Article",
    "@id": `${articleUrl}#article`,
    headline: article.title,
    description: description ?? article.excerpt ?? undefined,
    image: imageUrl,
    datePublished: toIsoDate(article.publishedAt),
    dateModified: toIsoDate(article.updatedAt),
    author: article.authorName ? { "@type": "Person", name: article.authorName } : undefined,
    publisher: { "@id": `${getRootUrl()}#website` },
    mainEntityOfPage: articleUrl,
    articleSection: article.categoryName,
    keywords: article.tags.map((tag) => tag.name).join(", ") || undefined,
    isPartOf: {
      "@type": "PublicationIssue",
      name: article.issueTitle,
      url: getCanonicalUrl(`/uscite/${article.issueSlug}`),
    },
  };
}

export function buildIssueCollectionPageJsonLd(issue: PublicCurrentIssueDetail, path: string) {
  const issueUrl = getCanonicalUrl(path);

  return {
    "@type": "CollectionPage",
    "@id": `${issueUrl}#issue`,
    name: issue.title,
    description: getIssuePlainDescription(issue),
    url: issueUrl,
    isPartOf: { "@id": `${getRootUrl()}#website` },
    datePublished: toIsoDate(issue.publishedAt),
    hasPart: issue.articles.map((article, index) => ({
      "@type": "Article",
      headline: article.title,
      description: article.excerpt ?? undefined,
      image: article.imageUrl
        ? {
            "@type": "ImageObject",
            url: resolveAbsoluteUrl(article.imageUrl),
            description: article.imageAlt ?? undefined,
          }
        : undefined,
      author: article.authorName ? { "@type": "Person", name: article.authorName } : undefined,
      datePublished: toIsoDate(article.publishedAt),
      position: index + 1,
      url: getCanonicalUrl(`/articoli/${article.slug}`),
    })),
  };
}

export function buildJsonLdGraph(nodes: object[]) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes,
  };
}

export function buildArticlePageJsonLd(
  article: PublicArticleDetailDto,
  description?: string | null,
) {
  return buildJsonLdGraph([
    buildWebsiteJsonLd(),
    buildBreadcrumbJsonLd([
      { name: seoConfig.siteName, path: "/" },
      { name: article.issueTitle, path: `/uscite/${article.issueSlug}` },
      { name: article.title, path: `/articoli/${article.slug}` },
    ]),
    buildArticleJsonLd(article, description),
  ]);
}

export function buildIssuePageJsonLd(issue: PublicCurrentIssueDetail) {
  return buildJsonLdGraph([
    buildWebsiteJsonLd(),
    buildBreadcrumbJsonLd([
      { name: seoConfig.siteName, path: "/" },
      { name: "Archivio", path: "/uscite" },
      { name: issue.title, path: `/uscite/${issue.slug}` },
    ]),
    buildIssueCollectionPageJsonLd(issue, `/uscite/${issue.slug}`),
  ]);
}

export function buildIssuesArchiveJsonLd() {
  return buildJsonLdGraph([
    buildWebsiteJsonLd(),
    buildBreadcrumbJsonLd([
      { name: seoConfig.siteName, path: "/" },
      { name: "Archivio", path: "/uscite" },
    ]),
  ]);
}

export function buildStaticPageJsonLd(title: string, path: string) {
  return buildJsonLdGraph([
    buildWebsiteJsonLd(),
    buildBreadcrumbJsonLd([
      { name: seoConfig.siteName, path: "/" },
      { name: title, path },
    ]),
  ]);
}
