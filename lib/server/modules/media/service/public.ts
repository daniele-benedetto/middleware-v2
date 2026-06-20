import "server-only";

import { extractCmsMediaPathname, inferMediaKind } from "@/lib/media/blob";
import { publicMediaRepository } from "@/lib/server/modules/media/repository/public";

export const publicMediaService = {
  async canServePublishedArticleImage(pathname: string) {
    if (inferMediaKind(pathname) !== "image") {
      return false;
    }

    const articles = await publicMediaRepository.listPublishedArticleImageUrls();

    return articles.some((article) => {
      if (!article.imageUrl) {
        return false;
      }

      return extractCmsMediaPathname(article.imageUrl) === pathname;
    });
  },
};
