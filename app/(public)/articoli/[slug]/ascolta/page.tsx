import { notFound } from "next/navigation";

import { ArticleListenPage } from "@/components/public/listen/article-listen-page";
import { i18n } from "@/lib/i18n";
import {
  getPublicArticleListenPageData,
  getPublicArticleListenStaticParams,
} from "@/lib/public/server/article-listen-page";
import { getCanonicalUrl } from "@/lib/seo";

import type { Metadata } from "next";

export const revalidate = 3600;

type PublicArticleListenRouteProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return getPublicArticleListenStaticParams();
}

export async function generateMetadata({
  params,
}: PublicArticleListenRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicArticleListenPageData(slug);
  const canonical = getCanonicalUrl(`/articoli/${data?.article.slug ?? slug}`);
  const text = i18n.public.listenPage;

  if (!data) {
    return {
      title: text.notFoundTitle,
      alternates: { canonical },
      robots: { index: false, follow: true, googleBot: { index: false, follow: true } },
    };
  }

  const title = text.metadataTitle(data.article.title);

  return {
    title,
    description: data.article.excerpt ?? undefined,
    alternates: { canonical },
    robots: { index: false, follow: true, googleBot: { index: false, follow: true } },
    openGraph: {
      type: "article",
      title,
      description: data.article.excerpt ?? undefined,
      url: canonical,
      images: data.article.imageUrl
        ? [{ url: data.article.imageUrl, alt: data.article.title }]
        : undefined,
    },
  };
}

export default async function PublicArticleListenRoute({ params }: PublicArticleListenRouteProps) {
  const { slug } = await params;
  const data = await getPublicArticleListenPageData(slug);

  if (!data) {
    notFound();
  }

  return <ArticleListenPage data={data} />;
}
