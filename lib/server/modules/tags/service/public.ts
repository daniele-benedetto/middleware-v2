import "server-only";

import { ApiError } from "@/lib/server/http/api-error";
import { publicTagsRepository } from "@/lib/server/modules/tags/repository/public";

import type { PublicTagDto } from "@/lib/server/modules/tags/dto/public";

type PublicTagRecord = {
  id: string;
  name: string;
  slug: string;
  _count?: { articles: number };
};

const toPublicTagDto = (tag: PublicTagRecord): PublicTagDto => ({
  id: tag.id,
  name: tag.name,
  slug: tag.slug,
  articlesCount: tag._count?.articles ?? 0,
});

export const publicTagsService = {
  async list() {
    const tags = await publicTagsRepository.list();
    return tags.map(toPublicTagDto);
  },
  async getBySlug(slug: string) {
    const tag = await publicTagsRepository.getBySlug(slug);

    if (!tag) {
      throw new ApiError(404, "NOT_FOUND", "Tag not found");
    }

    return toPublicTagDto(tag);
  },
};
