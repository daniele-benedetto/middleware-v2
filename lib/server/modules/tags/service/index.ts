import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { ApiError } from "@/lib/server/http/api-error";
import { tagsRepository } from "@/lib/server/modules/tags/repository";
import { normalizeSlug } from "@/lib/server/validation/slug";

import type { PaginationParams } from "@/lib/server/http/pagination";
import type { TagDto } from "@/lib/server/modules/tags/dto";
import type {
  CreateTagInput,
  ListTagsQuery,
  UpdateTagInput,
} from "@/lib/server/modules/tags/schema";

type TagRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: { articles: number };
};

const toTagDto = (tag: TagRecord): TagDto => {
  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    description: tag.description,
    isActive: tag.isActive,
    createdAt: tag.createdAt.toISOString(),
    updatedAt: tag.updatedAt.toISOString(),
    articlesCount: tag._count?.articles ?? 0,
  };
};

const ensureSlug = (value: string): string => {
  const slug = normalizeSlug(value);

  if (!slug) {
    throw new ApiError(400, "VALIDATION_ERROR", "Slug is required");
  }

  return slug;
};

export const tagsService = {
  async list(query: ListTagsQuery, pagination: PaginationParams) {
    const [tags, total] = await Promise.all([
      tagsRepository.list(query, pagination),
      tagsRepository.count(query),
    ]);

    return {
      items: tags.map(toTagDto),
      total,
    };
  },
  async getById(id: string) {
    const tag = await tagsRepository.getById(id);

    if (!tag) {
      throw new ApiError(404, "NOT_FOUND", "Tag not found");
    }

    return toTagDto(tag);
  },
  async create(input: CreateTagInput) {
    const normalizedInput = {
      ...input,
      slug: ensureSlug(input.slug ?? input.name),
    };

    try {
      const tag = await tagsRepository.create(normalizedInput);
      const tagWithCount = await tagsRepository.getById(tag.id);

      if (!tagWithCount) {
        throw new ApiError(404, "NOT_FOUND", "Tag not found");
      }

      return toTagDto(tagWithCount);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ApiError(409, "CONFLICT", "Tag slug already exists");
      }

      throw error;
    }
  },
  async update(id: string, input: UpdateTagInput) {
    const normalizedInput: UpdateTagInput = {
      ...input,
      slug: input.slug ? ensureSlug(input.slug) : undefined,
    };

    try {
      await tagsRepository.update(id, normalizedInput);
      const tag = await tagsRepository.getById(id);

      if (!tag) {
        throw new ApiError(404, "NOT_FOUND", "Tag not found");
      }

      return toTagDto(tag);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new ApiError(404, "NOT_FOUND", "Tag not found");
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ApiError(409, "CONFLICT", "Tag slug already exists");
      }

      throw error;
    }
  },
  async delete(id: string) {
    try {
      await tagsRepository.delete(id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new ApiError(404, "NOT_FOUND", "Tag not found");
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new ApiError(409, "CONFLICT", "Tag cannot be deleted due to related records");
      }

      throw error;
    }
  },
};
