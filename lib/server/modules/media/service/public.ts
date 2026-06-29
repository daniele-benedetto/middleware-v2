import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { inferMediaKind } from "@/lib/media/blob";
import { publicMediaRepository } from "@/lib/server/modules/media/repository/public";

export const PUBLIC_MEDIA_CACHE_TAG = "public-media";

export const publicMediaService = {
  async canServePublishedMedia(pathname: string) {
    "use cache";
    cacheLife("hours");
    cacheTag(PUBLIC_MEDIA_CACHE_TAG);

    const kind = inferMediaKind(pathname);

    if (kind !== "image" && kind !== "audio") {
      return false;
    }

    const isArticleMedia = await publicMediaRepository.hasPublishedArticleMedia(pathname);

    if (isArticleMedia || kind === "audio") {
      return isArticleMedia;
    }

    return publicMediaRepository.hasPublishedPageImage(pathname);
  },
  async canServePublishedImage(pathname: string) {
    if (inferMediaKind(pathname) !== "image") {
      return false;
    }

    return this.canServePublishedMedia(pathname);
  },
  async canServePublishedArticleImage(pathname: string) {
    return this.canServePublishedImage(pathname);
  },
};
