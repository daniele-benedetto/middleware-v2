import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { ApiError } from "@/lib/server/http/api-error";
import { articlesRepository } from "@/lib/server/modules/articles/repository";
import { assertPublishedAtConsistency } from "@/lib/server/validation/published";
import { normalizeSlug } from "@/lib/server/validation/slug";

import type { ArticleStatus } from "@/lib/generated/prisma/enums";
import type { PaginationParams } from "@/lib/server/http/pagination";
import type { ArticleDto } from "@/lib/server/modules/articles/dto";
import type {
  CreateArticleInput,
  ListArticlesQuery,
  ReorderArticlesInput,
  SyncArticleTagsInput,
  UpdateArticleInput,
} from "@/lib/server/modules/articles/schema";

const ensureSlug = (value: string): string => {
  const slug = normalizeSlug(value);

  if (!slug) {
    throw new ApiError(400, "VALIDATION_ERROR", "Slug is required");
  }

  return slug;
};

type ArticleRecord = {
  id: string;
  issueId: string;
  categoryId: string;
  authorId: string;
  title: string;
  slug: string;
  status: ArticleStatus;
  publishedAt: Date | null;
  isFeatured: boolean;
  position: number;
  createdAt: Date;
  updatedAt: Date;
  issue?: { title: string } | null;
  category?: { name: string } | null;
  author?: { name: string | null; email: string } | null;
  _count?: { tags: number };
};

const toArticleDto = (article: ArticleRecord): ArticleDto => {
  return {
    id: article.id,
    issueId: article.issueId,
    categoryId: article.categoryId,
    authorId: article.authorId,
    title: article.title,
    slug: article.slug,
    status: article.status,
    publishedAt: article.publishedAt?.toISOString() ?? null,
    isFeatured: article.isFeatured,
    position: article.position,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
    issueTitle: article.issue?.title ?? null,
    categoryName: article.category?.name ?? null,
    authorName: article.author?.name ?? null,
    authorEmail: article.author?.email ?? null,
    tagsCount: article._count?.tags ?? 0,
  };
};

const toArticlesDto = (articles: ArticleRecord[]): ArticleDto[] => {
  return articles.map(toArticleDto);
};

const isNotFoundError = (error: unknown): boolean => {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
};

const isUniqueError = (error: unknown): boolean => {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
};

export const articlesService = {
  async list(query: ListArticlesQuery, pagination: PaginationParams) {
    const [articles, total] = await Promise.all([
      articlesRepository.list(query, pagination),
      articlesRepository.count(query),
    ]);

    return {
      items: toArticlesDto(articles),
      total,
    };
  },
  async getById(id: string) {
    const article = await articlesRepository.getById(id);

    if (!article) {
      throw new ApiError(404, "NOT_FOUND", "Article not found");
    }

    return toArticleDto(article);
  },
  async create(input: CreateArticleInput) {
    const normalizedInput: CreateArticleInput = {
      ...input,
      slug: ensureSlug(input.slug),
    };

    try {
      const article = await articlesRepository.create(normalizedInput);
      const withRelations = await articlesRepository.getById(article.id);

      if (!withRelations) {
        throw new ApiError(404, "NOT_FOUND", "Article not found");
      }

      return toArticleDto(withRelations);
    } catch (error) {
      if (isUniqueError(error)) {
        throw new ApiError(409, "CONFLICT", "Article slug already exists for this issue");
      }

      throw error;
    }
  },
  async update(id: string, input: UpdateArticleInput) {
    const current = await articlesRepository.getById(id);

    if (!current) {
      throw new ApiError(404, "NOT_FOUND", "Article not found");
    }

    const normalizedInput: UpdateArticleInput = {
      ...input,
      slug: input.slug ? ensureSlug(input.slug) : undefined,
    };

    const nextStatus = normalizedInput.status ?? current.status;
    const nextPublishedAt =
      normalizedInput.publishedAt === undefined ? current.publishedAt : normalizedInput.publishedAt;

    assertPublishedAtConsistency(nextStatus, nextPublishedAt ?? null);

    try {
      await articlesRepository.update(id, normalizedInput);
      const article = await articlesRepository.getById(id);

      if (!article) {
        throw new ApiError(404, "NOT_FOUND", "Article not found");
      }

      return toArticleDto(article);
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new ApiError(404, "NOT_FOUND", "Article not found");
      }

      if (isUniqueError(error)) {
        throw new ApiError(409, "CONFLICT", "Article slug already exists for this issue");
      }

      throw error;
    }
  },
  async delete(id: string) {
    try {
      await articlesRepository.delete(id);
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new ApiError(404, "NOT_FOUND", "Article not found");
      }

      throw error;
    }
  },
  async syncTags(id: string, input: SyncArticleTagsInput) {
    const article = await articlesRepository.syncTags(id, input);

    if (!article) {
      throw new ApiError(404, "NOT_FOUND", "Article not found");
    }

    const withRelations = await articlesRepository.getById(article.id);

    if (!withRelations) {
      throw new ApiError(404, "NOT_FOUND", "Article not found");
    }

    return toArticleDto(withRelations);
  },
  async publish(id: string) {
    const current = await articlesRepository.getById(id);

    if (!current) {
      throw new ApiError(404, "NOT_FOUND", "Article not found");
    }

    if (current.status === "PUBLISHED" && current.publishedAt) {
      return toArticleDto(current);
    }

    try {
      await articlesRepository.publish(id);
      const article = await articlesRepository.getById(id);

      if (!article) {
        throw new ApiError(404, "NOT_FOUND", "Article not found");
      }

      return toArticleDto(article);
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new ApiError(404, "NOT_FOUND", "Article not found");
      }

      throw error;
    }
  },
  async unpublish(id: string) {
    try {
      await articlesRepository.unpublish(id);
      const article = await articlesRepository.getById(id);

      if (!article) {
        throw new ApiError(404, "NOT_FOUND", "Article not found");
      }

      return toArticleDto(article);
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new ApiError(404, "NOT_FOUND", "Article not found");
      }

      throw error;
    }
  },
  async archive(id: string) {
    try {
      await articlesRepository.archive(id);
      const article = await articlesRepository.getById(id);

      if (!article) {
        throw new ApiError(404, "NOT_FOUND", "Article not found");
      }

      return toArticleDto(article);
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new ApiError(404, "NOT_FOUND", "Article not found");
      }

      throw error;
    }
  },
  async feature(id: string) {
    try {
      await articlesRepository.feature(id);
      const article = await articlesRepository.getById(id);

      if (!article) {
        throw new ApiError(404, "NOT_FOUND", "Article not found");
      }

      return toArticleDto(article);
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new ApiError(404, "NOT_FOUND", "Article not found");
      }

      throw error;
    }
  },
  async unfeature(id: string) {
    try {
      await articlesRepository.unfeature(id);
      const article = await articlesRepository.getById(id);

      if (!article) {
        throw new ApiError(404, "NOT_FOUND", "Article not found");
      }

      return toArticleDto(article);
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new ApiError(404, "NOT_FOUND", "Article not found");
      }

      throw error;
    }
  },
  async reorder(input: ReorderArticlesInput) {
    const articles = await articlesRepository.reorder(input);

    if (articles.length === 0) {
      throw new ApiError(404, "NOT_FOUND", "No articles found for reorder");
    }

    return toArticleDto(articles[0]);
  },
};
