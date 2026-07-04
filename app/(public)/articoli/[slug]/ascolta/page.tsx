import { notFound } from "next/navigation";
import { connection } from "next/server";

import { ArticleListenPage } from "@/components/public/listen/article-listen-page";
import { i18n } from "@/lib/i18n";
import { getPublicArticleListenPageData } from "@/lib/public/server/article-listen-page";
import { buildArticleListenMetadata } from "@/lib/seo";

import type { Metadata } from "next";

type PublicArticleListenRouteProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PublicArticleListenRouteProps): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const data = await getPublicArticleListenPageData(slug);
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

export default async function PublicArticleListenRoute({ params }: PublicArticleListenRouteProps) {
  await connection();
  const { slug } = await params;
  const data = await getPublicArticleListenPageData(slug);

  if (!data) {
    notFound();
  }

  return <ArticleListenPage data={data} />;
}
