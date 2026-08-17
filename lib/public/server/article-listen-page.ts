import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { parseAudioChunks, type AudioChunk } from "@/lib/audio/audio-chunks";
import { extractCmsMediaPathname } from "@/lib/media/blob";
import { getPublicArticlePageData } from "@/lib/public/server/article-page";
import { mediaStorage } from "@/lib/server/storage/media-storage";

import type { PublicArticleDetailDto } from "@/lib/server/modules/articles/dto/public";

export const PUBLIC_ARTICLE_LISTEN_PAGE_REVALIDATE_SECONDS = 60 * 60;
export const PUBLIC_ARTICLE_LISTEN_PAGE_CACHE_TAG = "public-article";

export type PublicArticleListenMetadataData = {
  article: PublicArticleDetailDto;
  articleNumber: number | null;
};

async function readStreamAsText(stream: ReadableStream<Uint8Array>) {
  const response = new Response(stream);
  return response.text();
}

async function loadJsonFromBlobUrl(value: string) {
  const pathname = extractCmsMediaPathname(value);

  if (!pathname) {
    return null;
  }

  const result = await mediaStorage.get(pathname);

  if (result.contentType !== "application/json") {
    return null;
  }

  return JSON.parse(await readStreamAsText(result.stream));
}

async function loadJsonFromUrl(value: string) {
  try {
    const blobJson = await loadJsonFromBlobUrl(value);
    if (blobJson) return blobJson;

    const response = await fetch(value, {
      next: { revalidate: PUBLIC_ARTICLE_LISTEN_PAGE_REVALIDATE_SECONDS },
    });

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) return null;

    return response.json();
  } catch {
    return null;
  }
}

async function loadAudioChunks(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return parseAudioChunks(await loadJsonFromUrl(value));
  }

  return parseAudioChunks(value);
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
