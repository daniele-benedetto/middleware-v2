import { notFound } from "next/navigation";

import { ArticleListenPage } from "@/components/public/listen/article-listen-page";
import { i18n } from "@/lib/i18n";
import {
  getPublicArticleListenChunks,
  getPublicArticleListenMetadataData,
} from "@/lib/public/server/article-listen-page";
import { buildListenMetadata } from "@/lib/seo";

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

  const chunks = await chunksPromise;

  return <ArticleListenPage data={data} chunks={chunks ?? []} />;
}

export async function generateMetadata({
  params,
}: PublicArticleListenRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicArticleListenMetadataData(slug);
  const text = i18n.public.listenPage;

  if (!data) {
    return buildListenMetadata({
      title: text.notFoundTitle,
      path: `/articoli/${slug}/ascolta`,
    });
  }

  const title = text.metadataTitle(data.article.title);

  return buildListenMetadata({
    title,
    description: data.article.excerpt ?? undefined,
    path: `/articoli/${data.article.slug}/ascolta`,
    imageUrl: data.article.imageUrl,
  });
}

export default function PublicArticleListenRoute({ params }: PublicArticleListenRouteProps) {
  return <PublicArticleListenRouteContent params={params} />;
}
