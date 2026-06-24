import "server-only";

import { inferMediaKind } from "@/lib/media/blob";
import { publicMediaRepository } from "@/lib/server/modules/media/repository/public";

export const publicMediaService = {
  async canServePublishedMedia(pathname: string) {
    const kind = inferMediaKind(pathname);

    if (kind !== "image" && kind !== "audio") {
      return false;
    }

    const [isArticleMedia, isPageImage] = await Promise.all([
      publicMediaRepository.hasPublishedArticleMedia(pathname),
      kind === "image" ? publicMediaRepository.hasPublishedPageImage(pathname) : false,
    ]);

    return isArticleMedia || isPageImage;
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
