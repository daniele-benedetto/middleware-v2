import { getIssuePlainDescription } from "@/components/public/home/home-view-model";
import { getCoursePlainDescription } from "@/components/public/sections/formazione/course-archive-view-model";
import { seoConfig } from "@/lib/seo/config";
import { getCanonicalUrl, getOpenGraphImageUrl } from "@/lib/seo/metadata";
import { resolveAbsoluteUrl, toIsoDate } from "@/lib/seo/url";

import type { PublicCurrentIssueDetail, PublicIssueListItem } from "@/lib/public/types/issues";
import type { PublicArticleDetailDto } from "@/lib/server/modules/articles/dto/public";
import type { PublicCourseDetailDto } from "@/lib/server/modules/courses/dto/public";

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
    publisher: { "@id": `${rootUrl}#organization` },
  };
}

export function buildOrganizationJsonLd() {
  const rootUrl = getRootUrl();

  return {
    "@type": "Organization",
    "@id": `${rootUrl}#organization`,
    name: seoConfig.siteName,
    url: rootUrl,
    logo: {
      "@type": "ImageObject",
      url: resolveAbsoluteUrl("/brand/apple-icon.png"),
      width: 180,
      height: 180,
    },
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

export function buildWebPageJsonLd(title: string, path: string) {
  const url = getCanonicalUrl(path);

  return {
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    name: title,
    url,
    isPartOf: { "@id": `${getRootUrl()}#website` },
    inLanguage: "it-IT",
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
    publisher: { "@id": `${getRootUrl()}#organization` },
    mainEntityOfPage: articleUrl,
    articleSection: article.categoryName,
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

export function buildArchiveCollectionPageJsonLd(issues: PublicIssueListItem[]) {
  const archiveUrl = getCanonicalUrl("/uscite");

  return {
    "@type": "CollectionPage",
    "@id": `${archiveUrl}#archive`,
    name: "Archivio",
    url: archiveUrl,
    isPartOf: { "@id": `${getRootUrl()}#website` },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: issues.length,
      itemListElement: issues.map((issue, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: issue.title,
        url: getCanonicalUrl(`/uscite/${issue.slug}`),
      })),
    },
  };
}

export function buildFormazioneCollectionPageJsonLd(courses: PublicCourseDetailDto[]) {
  const archiveUrl = getCanonicalUrl("/formazione");

  return {
    "@type": "CollectionPage",
    "@id": `${archiveUrl}#formazione`,
    name: "Formazione",
    url: archiveUrl,
    isPartOf: { "@id": `${getRootUrl()}#website` },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: courses.length,
      itemListElement: courses.map((course, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: course.title,
        url: getCanonicalUrl(`/formazione/${course.slug}`),
      })),
    },
  };
}

export function buildCourseCollectionPageJsonLd(course: PublicCourseDetailDto) {
  const courseUrl = getCanonicalUrl(`/formazione/${course.slug}`);

  return {
    "@type": "CollectionPage",
    "@id": `${courseUrl}#course-page`,
    name: course.title,
    description: getCoursePlainDescription(course) ?? undefined,
    url: courseUrl,
    isPartOf: { "@id": `${getRootUrl()}#website` },
    datePublished: toIsoDate(course.publishedAt),
    mainEntity: {
      "@type": "Course",
      "@id": `${courseUrl}#course`,
      name: course.title,
      description: getCoursePlainDescription(course) ?? undefined,
      provider: { "@id": `${getRootUrl()}#organization` },
      hasPart: course.lessons.map((lesson, index) => ({
        "@type": "CreativeWork",
        position: index + 1,
        name: lesson.title,
        description: lesson.excerpt ?? undefined,
        datePublished: toIsoDate(lesson.publishedAt),
        url: getCanonicalUrl(`/formazione/${course.slug}/${lesson.slug}`),
      })),
    },
  };
}

export function buildArticlePageJsonLd(
  article: PublicArticleDetailDto,
  description?: string | null,
) {
  return buildJsonLdGraph([
    buildWebsiteJsonLd(),
    buildOrganizationJsonLd(),
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
    buildOrganizationJsonLd(),
    buildBreadcrumbJsonLd([
      { name: seoConfig.siteName, path: "/" },
      { name: "Archivio", path: "/uscite" },
      { name: issue.title, path: `/uscite/${issue.slug}` },
    ]),
    buildIssueCollectionPageJsonLd(issue, `/uscite/${issue.slug}`),
  ]);
}

export function buildIssuesArchiveJsonLd(issues: PublicIssueListItem[]) {
  return buildJsonLdGraph([
    buildWebsiteJsonLd(),
    buildOrganizationJsonLd(),
    buildBreadcrumbJsonLd([
      { name: seoConfig.siteName, path: "/" },
      { name: "Archivio", path: "/uscite" },
    ]),
    buildArchiveCollectionPageJsonLd(issues),
  ]);
}

export function buildFormazioneArchiveJsonLd(courses: PublicCourseDetailDto[]) {
  return buildJsonLdGraph([
    buildWebsiteJsonLd(),
    buildOrganizationJsonLd(),
    buildBreadcrumbJsonLd([
      { name: seoConfig.siteName, path: "/" },
      { name: "Formazione", path: "/formazione" },
    ]),
    buildFormazioneCollectionPageJsonLd(courses),
  ]);
}

export function buildCoursePageJsonLd(course: PublicCourseDetailDto) {
  return buildJsonLdGraph([
    buildWebsiteJsonLd(),
    buildOrganizationJsonLd(),
    buildBreadcrumbJsonLd([
      { name: seoConfig.siteName, path: "/" },
      { name: "Formazione", path: "/formazione" },
      { name: course.title, path: `/formazione/${course.slug}` },
    ]),
    buildCourseCollectionPageJsonLd(course),
  ]);
}

export function buildStaticPageJsonLd(title: string, path: string) {
  return buildJsonLdGraph([
    buildWebsiteJsonLd(),
    buildOrganizationJsonLd(),
    buildWebPageJsonLd(title, path),
    buildBreadcrumbJsonLd([
      { name: seoConfig.siteName, path: "/" },
      { name: title, path },
    ]),
  ]);
}
