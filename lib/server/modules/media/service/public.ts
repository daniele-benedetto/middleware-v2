import "server-only";

import { extractCmsMediaPathname, inferMediaKind } from "@/lib/media/blob";
import { publicMediaRepository } from "@/lib/server/modules/media/repository/public";

type RichTextNode = {
  type?: unknown;
  attrs?: unknown;
  content?: unknown;
};

function contentReferencesImagePathname(value: unknown, pathname: string): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => contentReferencesImagePathname(item, pathname));
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  const node = value as RichTextNode;

  if (node.type === "image" && node.attrs && typeof node.attrs === "object") {
    const src = (node.attrs as { src?: unknown }).src;
    if (typeof src === "string" && extractCmsMediaPathname(src) === pathname) {
      return true;
    }
  }

  return contentReferencesImagePathname(node.content, pathname);
}

export const publicMediaService = {
  async canServePublishedImage(pathname: string) {
    if (inferMediaKind(pathname) !== "image") {
      return false;
    }

    const [articles, pages] = await Promise.all([
      publicMediaRepository.listPublishedArticleImageUrls(),
      publicMediaRepository.listPublishedPageContent(),
    ]);

    const isArticleImage = articles.some((article) => {
      if (!article.imageUrl) {
        return false;
      }

      return extractCmsMediaPathname(article.imageUrl) === pathname;
    });

    if (isArticleImage) {
      return true;
    }

    return pages.some((page) => contentReferencesImagePathname(page.contentRich, pathname));
  },
  async canServePublishedArticleImage(pathname: string) {
    return this.canServePublishedImage(pathname);
  },
};
