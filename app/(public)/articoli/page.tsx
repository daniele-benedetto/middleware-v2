import { PublicArticlesArchivePage } from "@/components/public/pages/public-articles-archive-page";
import { i18n } from "@/lib/i18n";
import { getPublicArticlesArchiveData } from "@/lib/public/server/articles-archive";
import { buildPageMetadata } from "@/lib/seo";

import type { Metadata } from "next";

const archivePath = "/articoli";

export async function generateMetadata(): Promise<Metadata> {
  const text = i18n.public.articlesArchive.metadata;

  return buildPageMetadata({
    title: text.title,
    description: text.description,
    path: archivePath,
    socialImageSection: "articoli",
    socialImageTheme: "cream",
  });
}

export default async function PublicArticlesArchiveRoute() {
  const { articles } = await getPublicArticlesArchiveData();

  return <PublicArticlesArchivePage articles={articles} />;
}
