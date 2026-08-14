export { seoConfig } from "@/lib/seo/config";
export { buildHomeJsonLd } from "@/lib/seo/home-json-ld";
export { buildLlmsTxt } from "@/lib/seo/llms";
export {
  buildArticlePageJsonLd,
  buildArticlesArchiveJsonLd,
  buildBreadcrumbJsonLd,
  buildCoursePageJsonLd,
  buildFormazioneArchiveJsonLd,
  buildIssuePageJsonLd,
  buildIssuesArchiveJsonLd,
  buildJsonLdGraph,
  buildLessonPageJsonLd,
  buildStaticPageJsonLd,
  buildWebsiteJsonLd,
} from "@/lib/seo/json-ld";
export {
  buildArticleListenMetadata,
  buildArticleMetadata,
  buildCmsMetadata,
  buildLessonMetadata,
  buildPageMetadata,
  buildRootMetadata,
  getCanonicalUrl,
  getGeneratedSocialImageUrl,
  getOpenGraphImageUrl,
  getSitemapUrl,
  getTwitterImageUrl,
} from "@/lib/seo/metadata";
export { resolveAbsoluteUrl, toIsoDate } from "@/lib/seo/url";
