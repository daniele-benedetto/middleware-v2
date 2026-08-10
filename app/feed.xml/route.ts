import { getPublicArticlesArchiveData } from "@/lib/public/server/articles-archive";
import { buildRssFeed } from "@/lib/seo/rss";

import type { RssItem } from "@/lib/seo/rss";

export async function GET() {
  const { articles } = await getPublicArticlesArchiveData();

  const items: RssItem[] = articles.map((article) => ({
    title: article.title,
    path: `/articoli/${article.slug}`,
    description: article.excerpt,
    publishedAt: article.publishedAt,
    author: article.authorName,
    category: article.categoryName,
    imageUrl: article.imageUrl,
  }));

  return new Response(buildRssFeed(items), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
