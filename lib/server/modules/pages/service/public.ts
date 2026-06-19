import "server-only";

import { ApiError } from "@/lib/server/http/api-error";
import { publicPagesRepository } from "@/lib/server/modules/pages/repository/public";

import type { PublicPageDto } from "@/lib/server/modules/pages/dto/public";

type PublicPageRecord = {
  id: string;
  title: string;
  slug: string;
  contentRich: unknown;
  publishedAt: Date | null;
  updatedAt: Date;
};

const toPublicPageDto = (page: PublicPageRecord): PublicPageDto => {
  if (!page.publishedAt) {
    throw new ApiError(500, "INTERNAL_ERROR", "Public page missing publishedAt");
  }

  return {
    id: page.id,
    title: page.title,
    slug: page.slug,
    contentRich: page.contentRich,
    publishedAt: page.publishedAt.toISOString(),
    updatedAt: page.updatedAt.toISOString(),
  };
};

export const publicPagesService = {
  async getBySlug(slug: string) {
    const page = await publicPagesRepository.getBySlug(slug);

    if (!page) {
      throw new ApiError(404, "NOT_FOUND", "Page not found");
    }

    return toPublicPageDto(page as PublicPageRecord);
  },
  async listPublished() {
    const pages = await publicPagesRepository.listPublished();
    return pages.map((page) => toPublicPageDto(page as PublicPageRecord));
  },
};
