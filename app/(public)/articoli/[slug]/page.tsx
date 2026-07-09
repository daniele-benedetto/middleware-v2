import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PublicArticlePage } from "@/components/public/pages";
import { i18n } from "@/lib/i18n";
import { getPublicArticlePageData } from "@/lib/public/server/article-page";
import { buildArticleMetadata, buildPageMetadata } from "@/lib/seo";

import type { Metadata } from "next";

type PublicArticleRouteProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PublicArticleRouteProps): Promise<Metadata> {
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
  });
}

async function PublicArticleRouteContent({ params }: PublicArticleRouteProps) {
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

export default function PublicArticleRoute({ params }: PublicArticleRouteProps) {
  return (
    <Suspense fallback={null}>
      <PublicArticleRouteContent params={params} />
    </Suspense>
  );
}
