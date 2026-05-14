import "server-only";

import { ApiError } from "@/lib/server/http/api-error";
import { publicCategoriesRepository } from "@/lib/server/modules/categories/repository/public";

import type { PublicCategoryDto } from "@/lib/server/modules/categories/dto/public";

type PublicCategoryRecord = {
  id: string;
  name: string;
  slug: string;
  description: unknown;
  _count?: { articles: number };
};

const toPublicCategoryDto = (category: PublicCategoryRecord): PublicCategoryDto => ({
  id: category.id,
  name: category.name,
  slug: category.slug,
  description: category.description ?? null,
  articlesCount: category._count?.articles ?? 0,
});

export const publicCategoriesService = {
  async list() {
    const categories = await publicCategoriesRepository.list();
    return categories.map(toPublicCategoryDto);
  },
  async getBySlug(slug: string) {
    const category = await publicCategoriesRepository.getBySlug(slug);

    if (!category) {
      throw new ApiError(404, "NOT_FOUND", "Category not found");
    }

    return toPublicCategoryDto(category);
  },
};
