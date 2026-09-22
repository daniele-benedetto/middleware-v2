import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { type AudioChunk } from "@/lib/audio/audio-chunks";
import { getPublicArticlePageData } from "@/lib/public/server/article-page";
import { loadPublicAudioChunks } from "@/lib/public/server/audio-chunk-source";

import type { PublicArticleDetailDto } from "@/lib/server/modules/articles/dto/public";

export const PUBLIC_ARTICLE_LISTEN_PAGE_REVALIDATE_SECONDS = 60 * 60;
export const PUBLIC_ARTICLE_LISTEN_PAGE_CACHE_TAG = "public-article";

export type PublicArticleListenMetadataData = {
  article: PublicArticleDetailDto;
  articleNumber: number | null;
};

async function loadAudioChunks(value: unknown) {
  return loadPublicAudioChunks(value);
}

export async function getPublicArticleListenMetadataData(
  slug: string,
): Promise<PublicArticleListenMetadataData | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_ARTICLE_LISTEN_PAGE_CACHE_TAG);

  const { article, articleNumber } = await getPublicArticlePageData(slug);

  if (!article?.audioUrl) {
    return null;
  }

  return { article, articleNumber };
}

export async function getPublicArticleListenChunks(slug: string): Promise<AudioChunk[] | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_ARTICLE_LISTEN_PAGE_CACHE_TAG);

  const data = await getPublicArticleListenMetadataData(slug);

  if (!data) {
    return null;
  }

  return loadAudioChunks(data.article.audioChunks);
}
