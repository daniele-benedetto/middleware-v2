import "server-only";

import { createCmsDomainErrorDetails } from "@/lib/cms/errors/domain-error-details";
import { Prisma } from "@/lib/generated/prisma/client";
import { ApiError } from "@/lib/server/http/api-error";
import { authorsRepository } from "@/lib/server/modules/authors/repository";
import { normalizeSlug } from "@/lib/server/validation/slug";

import type { ArticleStatus } from "@/lib/generated/prisma/enums";
import type { PaginationParams } from "@/lib/server/http/pagination";
import type { AuthorDetailDto, AuthorDto } from "@/lib/server/modules/authors/dto";
import type {
  CreateAuthorInput,
  ListAuthorsQuery,
  UpdateAuthorInput,
} from "@/lib/server/modules/authors/schema";

type AuthorRecord = {
  id: string;
  name: string;
  slug: string;
  bioRich: unknown;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: { articles: number };
};

type AuthorDetailRecord = AuthorRecord & {
  articles?: Array<{
    id: string;
    title: string;
    status: ArticleStatus;
    isFeatured: boolean;
    position: number;
  }>;
};

const ensureSlug = (value: string): string => {
  const slug = normalizeSlug(value);

  if (!slug) {
    throw new ApiError(400, "VALIDATION_ERROR", "Slug is required");
  }

  return slug;
};

const toAuthorDto = (author: AuthorRecord): AuthorDto => {
  return {
    id: author.id,
    name: author.name,
    slug: author.slug,
    bioRich: author.bioRich ?? null,
    isActive: author.isActive,
    createdAt: author.createdAt.toISOString(),
    updatedAt: author.updatedAt.toISOString(),
    articlesCount: author._count?.articles ?? 0,
  };
};

const toAuthorDetailDto = (author: AuthorDetailRecord): AuthorDetailDto => {
  return {
    ...toAuthorDto(author),
    articles: (author.articles ?? []).map((article) => ({
      id: article.id,
      title: article.title,
      status: article.status,
      isFeatured: article.isFeatured,
      position: article.position,
    })),
  };
};

export const authorsService = {
  async list(query: ListAuthorsQuery, pagination: PaginationParams) {
    const [authors, total] = await Promise.all([
      authorsRepository.list(query, pagination),
      authorsRepository.count(query),
    ]);

    return {
      items: authors.map(toAuthorDto),
      total,
    };
  },
  async getById(id: string) {
    const author = await authorsRepository.getById(id);

    if (!author) {
      throw new ApiError(404, "NOT_FOUND", "Author not found");
    }

    return toAuthorDetailDto(author as AuthorDetailRecord);
  },
  async create(input: CreateAuthorInput) {
    const normalizedInput = {
      ...input,
      slug: ensureSlug(input.slug ?? input.name),
    };

    try {
      const author = await authorsRepository.create(normalizedInput);
      const authorWithCount = await authorsRepository.getById(author.id);

      if (!authorWithCount) {
        throw new ApiError(404, "NOT_FOUND", "Author not found");
      }

      return toAuthorDto(authorWithCount);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ApiError(
          409,
          "CONFLICT",
          "Author slug already exists",
          createCmsDomainErrorDetails("AUTHOR_SLUG_EXISTS"),
        );
      }

      throw error;
    }
  },
  async update(id: string, input: UpdateAuthorInput) {
    const normalizedInput: UpdateAuthorInput = {
      ...input,
      slug: input.slug ? ensureSlug(input.slug) : undefined,
    };

    try {
      await authorsRepository.update(id, normalizedInput);
      const author = await authorsRepository.getById(id);

      if (!author) {
        throw new ApiError(404, "NOT_FOUND", "Author not found");
      }

      return toAuthorDto(author);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new ApiError(404, "NOT_FOUND", "Author not found");
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ApiError(
          409,
          "CONFLICT",
          "Author slug already exists",
          createCmsDomainErrorDetails("AUTHOR_SLUG_EXISTS"),
        );
      }

      throw error;
    }
  },
  async delete(id: string) {
    try {
      await authorsRepository.delete(id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new ApiError(404, "NOT_FOUND", "Author not found");
      }

      throw error;
    }
  },
};
