import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ArticleListenPage } from "@/components/public/listen/article-listen-page";
import { i18n } from "@/lib/i18n";
import {
  getPublicArticleListenChunks,
  getPublicArticleListenMetadataData,
} from "@/lib/public/server/article-listen-page";
import { buildArticleListenMetadata } from "@/lib/seo";

import type { Metadata } from "next";

type PublicArticleListenRouteProps = {
  params: Promise<{ slug: string }>;
};

async function PublicArticleListenRouteContent({ params }: PublicArticleListenRouteProps) {
  const { slug } = await params;
  const dataPromise = getPublicArticleListenMetadataData(slug);
  const chunksPromise = getPublicArticleListenChunks(slug);
  const data = await dataPromise;

  if (!data) {
    notFound();
  }

  return <ArticleListenPage data={data} chunksPromise={chunksPromise} />;
}

export async function generateMetadata({
  params,
}: PublicArticleListenRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicArticleListenMetadataData(slug);
  const text = i18n.public.listenPage;

  if (!data) {
    return buildArticleListenMetadata({
      title: text.notFoundTitle,
      slug,
    });
  }

  const title = text.metadataTitle(data.article.title);

  return buildArticleListenMetadata({
    title,
    description: data.article.excerpt ?? undefined,
    slug: data.article.slug,
    imageUrl: data.article.imageUrl,
  });
}

export default function PublicArticleListenRoute({ params }: PublicArticleListenRouteProps) {
  return (
    <Suspense fallback={null}>
      <PublicArticleListenRouteContent params={params} />
    </Suspense>
  );
}
