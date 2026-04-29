import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { ApiError } from "@/lib/server/http/api-error";
import { categoriesRepository } from "@/lib/server/modules/categories/repository";
import { normalizeSlug } from "@/lib/server/validation/slug";

import type { ArticleStatus } from "@/lib/generated/prisma/enums";
import type { PaginationParams } from "@/lib/server/http/pagination";
import type { CategoryDetailDto, CategoryDto } from "@/lib/server/modules/categories/dto";
import type {
  CreateCategoryInput,
  ListCategoriesQuery,
  UpdateCategoryInput,
} from "@/lib/server/modules/categories/schema";

type CategoryRecord = {
  id: string;
  name: string;
  slug: string;
  description: unknown;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: { articles: number };
};

type CategoryDetailRecord = CategoryRecord & {
  articles?: Array<{
    id: string;
    title: string;
    status: ArticleStatus;
    isFeatured: boolean;
    position: number;
  }>;
};

const toCategoryDto = (category: CategoryRecord): CategoryDto => {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description ?? null,
    isActive: category.isActive,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
    articlesCount: category._count?.articles ?? 0,
  };
};

const toCategoryDetailDto = (category: CategoryDetailRecord): CategoryDetailDto => {
  return {
    ...toCategoryDto(category),
    articles: (category.articles ?? []).map((article) => ({
      id: article.id,
      title: article.title,
      status: article.status,
      isFeatured: article.isFeatured,
      position: article.position,
    })),
  };
};

const ensureSlug = (value: string): string => {
  const slug = normalizeSlug(value);

  if (!slug) {
    throw new ApiError(400, "VALIDATION_ERROR", "Slug is required");
  }

  return slug;
};

export const categoriesService = {
  async list(query: ListCategoriesQuery, pagination: PaginationParams) {
    const [categories, total] = await Promise.all([
      categoriesRepository.list(query, pagination),
      categoriesRepository.count(query),
    ]);

    return {
      items: categories.map(toCategoryDto),
      total,
    };
  },
  async getById(id: string) {
    const category = await categoriesRepository.getById(id);

    if (!category) {
      throw new ApiError(404, "NOT_FOUND", "Category not found");
    }

    return toCategoryDetailDto(category as CategoryDetailRecord);
  },
  async create(input: CreateCategoryInput) {
    const normalizedInput = {
      ...input,
      slug: ensureSlug(input.slug ?? input.name),
    };

    try {
      const category = await categoriesRepository.create(normalizedInput);
      const categoryWithCount = await categoriesRepository.getById(category.id);

      if (!categoryWithCount) {
        throw new ApiError(404, "NOT_FOUND", "Category not found");
      }

      return toCategoryDto(categoryWithCount);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ApiError(409, "CONFLICT", "Category slug already exists");
      }

      throw error;
    }
  },
  async update(id: string, input: UpdateCategoryInput) {
    const normalizedInput: UpdateCategoryInput = {
      ...input,
      slug: input.slug ? ensureSlug(input.slug) : undefined,
    };

    try {
      await categoriesRepository.update(id, normalizedInput);
      const category = await categoriesRepository.getById(id);

      if (!category) {
        throw new ApiError(404, "NOT_FOUND", "Category not found");
      }

      return toCategoryDto(category);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new ApiError(404, "NOT_FOUND", "Category not found");
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ApiError(409, "CONFLICT", "Category slug already exists");
      }

      throw error;
    }
  },
  async delete(id: string) {
    try {
      await categoriesRepository.delete(id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new ApiError(404, "NOT_FOUND", "Category not found");
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new ApiError(409, "CONFLICT", "Category cannot be deleted due to related records");
      }

      throw error;
    }
  },
};
