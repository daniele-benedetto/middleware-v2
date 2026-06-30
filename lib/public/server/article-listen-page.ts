import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { parseAudioChunks, type AudioChunk } from "@/lib/audio/audio-chunks";
import { extractCmsMediaPathname } from "@/lib/media/blob";
import { ensureNonEmptyStaticParams } from "@/lib/public/server/static-params";
import { ApiError } from "@/lib/server/http/api-error";
import { publicArticlesService } from "@/lib/server/modules/articles/service/public";
import { mediaStorage } from "@/lib/server/storage/media-storage";

import type { PublicArticleDetailDto } from "@/lib/server/modules/articles/dto/public";

export const PUBLIC_ARTICLE_LISTEN_PAGE_REVALIDATE_SECONDS = 60 * 60;
export const PUBLIC_ARTICLE_LISTEN_PAGE_CACHE_TAG = "public-article";

export type PublicArticleListenPageData = {
  article: PublicArticleDetailDto;
  chunks: AudioChunk[];
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

async function getArticleBySlug(slug: string) {
  try {
    return await publicArticlesService.getBySlug(slug);
  } catch (error) {
    if (error instanceof ApiError && error.code === "NOT_FOUND") {
      return null;
    }

    console.error("public.getPublicArticleListenPageData article failed", { slug, error });
    return null;
  }
}

export async function getPublicArticleListenPageData(
  slug: string,
): Promise<PublicArticleListenPageData | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_ARTICLE_LISTEN_PAGE_CACHE_TAG);

  const article = await getArticleBySlug(slug);

  if (!article?.audioUrl) {
    return null;
  }

  return {
    article,
    chunks: await loadAudioChunks(article.audioChunks),
  };
}

export async function getPublicArticleListenStaticParams() {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_ARTICLE_LISTEN_PAGE_CACHE_TAG);

  try {
    const articles = await publicArticlesService.listWithAudio();
    return ensureNonEmptyStaticParams(articles.map((article) => ({ slug: article.slug })));
  } catch (error) {
    console.error("public.getPublicArticleListenStaticParams audio articles failed", { error });
    return ensureNonEmptyStaticParams([]);
  }
}
