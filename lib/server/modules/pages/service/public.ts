import "server-only";

import { ApiError } from "@/lib/server/http/api-error";
import { issueTitleStyledSchema } from "@/lib/server/modules/issues/schema";
import { publicPagesRepository } from "@/lib/server/modules/pages/repository/public";

import type { PublicPageDto } from "@/lib/server/modules/pages/dto/public";
import type { PageTitleStyled } from "@/lib/server/modules/pages/schema";

type PublicPageRecord = {
  id: string;
  title: string;
  titleStyled: unknown;
  slug: string;
  excerpt: string | null;
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
    titleStyled: parsePageTitleStyled(page.titleStyled),
    slug: page.slug,
    excerpt: page.excerpt,
    contentRich: page.contentRich,
    publishedAt: page.publishedAt.toISOString(),
    updatedAt: page.updatedAt.toISOString(),
  };
};

function parsePageTitleStyled(value: unknown): PageTitleStyled | null {
  const result = issueTitleStyledSchema.nullable().safeParse(value);
  return result.success ? result.data : null;
}

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
