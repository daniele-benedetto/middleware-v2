import { notFound } from "next/navigation";

import { PublicArticlePage } from "@/components/public/pages";
import {
  getPublicArticlePageData,
  getPublicArticleStaticParams,
} from "@/lib/public/server/article-page";
import { buildArticleMetadata, buildPageMetadata } from "@/lib/seo";

import type { Metadata } from "next";

export const revalidate = 3600;

type PublicArticleRouteProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return getPublicArticleStaticParams();
}

export async function generateMetadata({ params }: PublicArticleRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const { article, description } = await getPublicArticlePageData(slug);

  if (!article) {
    return buildPageMetadata({
      title: "Articolo non trovato",
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
