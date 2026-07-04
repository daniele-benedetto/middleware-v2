import { notFound } from "next/navigation";
import { connection } from "next/server";

import { PublicArticlePage } from "@/components/public/pages";
import { i18n } from "@/lib/i18n";
import { getPublicArticlePageData } from "@/lib/public/server/article-page";
import { buildArticleMetadata, buildPageMetadata } from "@/lib/seo";

import type { Metadata } from "next";

type PublicArticleRouteProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PublicArticleRouteProps): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const { article, description } = await getPublicArticlePageData(slug);

  if (!article) {
    return buildPageMetadata({
      title: i18n.public.metadata.articleNotFound,
      path: `/articoli/${slug}`,
      index: false,
    });
  }

  return buildArticleMetadata({
    title: article.title,
    description,
    slug: article.slug,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    imageUrl: article.imageUrl,
    authorName: article.authorName,
    tags: article.tags.map((tag) => tag.name),
  });
}

export default async function PublicArticleRoute({ params }: PublicArticleRouteProps) {
  await connection();
  const { slug } = await params;
  const { article, articleNumber, relatedArticles } = await getPublicArticlePageData(slug);

  if (!article) {
    notFound();
  }

  return (
    <PublicArticlePage
      article={article}
      articleNumber={articleNumber}
      relatedArticles={relatedArticles}
    />
  );
}
