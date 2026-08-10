import { seoConfig } from "@/lib/seo/config";
import { getCanonicalUrl } from "@/lib/seo/metadata";
import { toOptimizedImageUrl } from "@/lib/seo/social-image";

export type RssItem = {
  title: string;
  path: string;
  description?: string | null;
  publishedAt: string;
  author?: string | null;
  category?: string | null;
  imageUrl?: string | null;
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toRfc822(value: string): string {
  return new Date(value).toUTCString();
}

function renderTag(name: string, value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  return `    <${name}>${escapeXml(value)}</${name}>\n`;
}

function renderItem(item: RssItem): string {
  const url = getCanonicalUrl(item.path);
  const enclosure = item.imageUrl
    ? `    <enclosure url="${escapeXml(toOptimizedImageUrl(item.imageUrl))}" type="image/jpeg" />\n`
    : "";

  return (
    "  <item>\n" +
    renderTag("title", item.title) +
    `    <link>${escapeXml(url)}</link>\n` +
    `    <guid isPermaLink="true">${escapeXml(url)}</guid>\n` +
    `    <pubDate>${toRfc822(item.publishedAt)}</pubDate>\n` +
    renderTag("description", item.description) +
    renderTag("dc:creator", item.author) +
    renderTag("category", item.category) +
    enclosure +
    "  </item>\n"
  );
}

export function buildRssFeed(items: RssItem[]): string {
  const feedUrl = getCanonicalUrl("/feed.xml");
  const lastBuildDate = items[0]?.publishedAt;

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">\n' +
    "<channel>\n" +
    renderTag("title", seoConfig.defaultTitle) +
    `  <link>${escapeXml(getCanonicalUrl("/"))}</link>\n` +
    renderTag("description", seoConfig.defaultDescription) +
    `  <language>${seoConfig.language.toLowerCase()}</language>\n` +
    `  <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />\n` +
    (lastBuildDate ? `  <lastBuildDate>${toRfc822(lastBuildDate)}</lastBuildDate>\n` : "") +
    items.map(renderItem).join("") +
    "</channel>\n" +
    "</rss>\n"
  );
}
