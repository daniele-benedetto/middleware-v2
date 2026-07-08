import "server-only";

import { createCmsDomainErrorDetails } from "@/lib/cms/errors/domain-error-details";
import { Prisma } from "@/lib/generated/prisma/client";
import { resolvePublicMediaUrl } from "@/lib/media/blob";
import { ApiError } from "@/lib/server/http/api-error";
import { articlesRepository } from "@/lib/server/modules/articles/repository";
import { assertPublishedAtConsistency } from "@/lib/server/validation/published";
import { normalizeSlug } from "@/lib/server/validation/slug";

import type { ArticleStatus } from "@/lib/generated/prisma/enums";
import type { PaginationParams } from "@/lib/server/http/pagination";
import type { ArticleDetailDto, ArticleDto } from "@/lib/server/modules/articles/dto";
import type { PublicArticleDetailDto } from "@/lib/server/modules/articles/dto/public";
import type {
  CreateArticlePersistInput,
  UpdateArticlePersistInput,
} from "@/lib/server/modules/articles/repository";
import type {
  ArticleTitleStyled,
  CreateArticleInput,
  ListArticlesQuery,
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
  authorId: string | null;
  title: string;
  titleStyled: unknown;
  slug: string;
  status: ArticleStatus;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  issue?: { slug?: string; title: string } | null;
  category?: { slug?: string; name: string } | null;
  author?: { name: string } | null;
};

type ArticleDetailRecord = ArticleRecord & {
  excerpt: string | null;
  excerptRich: unknown;
  contentRich: unknown;
  imageUrl: string | null;
  imageAlt: string | null;
  audioUrl: string | null;
  audioChunks: unknown;
};

function collectRichTextFragments(value: unknown, fragments: string[]) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectRichTextFragments(item, fragments));
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  const node = value as { text?: unknown; type?: unknown; content?: unknown };

  if (typeof node.text === "string") {
    fragments.push(node.text);
  }

  if (node.type === "hardBreak") {
    fragments.push("\n");
  }

  if (node.content !== undefined) {
    collectRichTextFragments(node.content, fragments);
  }
}

function extractPlainTextFromRichText(value: unknown): string | null {
  const fragments: string[] = [];
  collectRichTextFragments(value, fragments);

  const text = fragments.join(" ").replace(/\s+/g, " ").trim();
  return text || null;
}

function createRichTextDocFromPlainText(value: string): unknown {
  const paragraphs = value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({
      type: "paragraph",
      content: [{ type: "text", text: line }],
    }));

  return {
    type: "doc",
    content: paragraphs.length > 0 ? paragraphs : [{ type: "paragraph" }],
  };
}

const WORDS_PER_MINUTE = 220;

function calculateReadingTimeMinutes(contentRich: unknown) {
  const text = extractPlainTextFromRichText(contentRich);
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

function toCreateExcerptPersist(
  input: CreateArticleInput,
): Pick<CreateArticlePersistInput, "excerpt" | "excerptRich"> {
  if (input.excerptRich === undefined) {
    return {};
  }

  return {
    excerpt: extractPlainTextFromRichText(input.excerptRich) ?? undefined,
    excerptRich: input.excerptRich,
  };
}

function toUpdateExcerptPersist(
  input: UpdateArticleInput,
): Pick<UpdateArticlePersistInput, "excerpt" | "excerptRich"> {
  if (input.excerptRich === undefined) {
    return {};
  }

  return {
    excerpt: extractPlainTextFromRichText(input.excerptRich),
    excerptRich: input.excerptRich,
  };
}

const toArticleDto = (article: ArticleRecord): ArticleDto => {
  return {
    id: article.id,
    issueId: article.issueId,
    categoryId: article.categoryId,
    authorId: article.authorId,
    title: article.title,
    titleStyled: (article.titleStyled as ArticleTitleStyled | null) ?? null,
    slug: article.slug,
    status: article.status,
    publishedAt: article.publishedAt?.toISOString() ?? null,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
    issueTitle: article.issue?.title ?? null,
    categoryName: article.category?.name ?? null,
    authorName: article.author?.name ?? null,
  };
};

const toArticleDetailDto = (article: ArticleDetailRecord): ArticleDetailDto => {
  return {
    ...toArticleDto(article),
    excerpt: article.excerpt,
    excerptRich:
      article.excerptRich ??
      (article.excerpt ? createRichTextDocFromPlainText(article.excerpt) : null),
    contentRich: article.contentRich,
    imageUrl: article.imageUrl,
    imageAlt: article.imageAlt,
    audioUrl: article.audioUrl,
    audioChunks: (article.audioChunks ?? null) as ArticleDetailDto["audioChunks"],
  };
};

const toPreviewPublishedAt = (article: ArticleDetailRecord) => {
  return (article.publishedAt ?? article.updatedAt ?? article.createdAt).toISOString();
};

const toPublicArticlePreviewDto = (article: ArticleDetailRecord): PublicArticleDetailDto => {
  if (!article.issue?.slug || !article.category?.slug) {
    throw new ApiError(500, "INTERNAL_ERROR", "Article preview missing required relations");
  }

  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    titleStyled: (article.titleStyled as ArticleTitleStyled | null) ?? null,
    excerpt: article.excerpt,
    imageUrl: resolvePublicMediaUrl(article.imageUrl),
    imageAlt: article.imageAlt,
    hasAudio: Boolean(article.audioUrl),
    publishedAt: toPreviewPublishedAt(article),
    issueId: article.issueId,
    issueSlug: article.issue.slug,
    issueTitle: article.issue.title,
    categoryId: article.categoryId,
    categorySlug: article.category.slug,
    categoryName: article.category.name,
    authorId: article.authorId,
    authorName: article.author?.name ?? null,
    excerptRich: article.excerptRich ?? null,
    contentRich: article.contentRich,
    readingTimeMinutes: calculateReadingTimeMinutes(article.contentRich),
    audioUrl: resolvePublicMediaUrl(article.audioUrl),
    audioChunks: article.audioChunks ?? null,
    updatedAt: article.updatedAt.toISOString(),
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

const isRelationError = (error: unknown): boolean => {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003";
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

    return toArticleDetailDto(article as ArticleDetailRecord);
  },
  async getPreviewById(id: string) {
    const article = await articlesRepository.getById(id);

    if (!article) {
      throw new ApiError(404, "NOT_FOUND", "Article not found");
    }

    return toPublicArticlePreviewDto(article as ArticleDetailRecord);
  },
  async create(input: CreateArticleInput) {
    const normalizedInput: CreateArticlePersistInput = {
      ...input,
      slug: ensureSlug(input.slug),
      ...toCreateExcerptPersist(input),
    };

    try {
      const article = await articlesRepository.create(normalizedInput);
      return toArticleDto(article);
    } catch (error) {
      if (isUniqueError(error)) {
        throw new ApiError(
          409,
          "CONFLICT",
          "Article slug already exists",
          createCmsDomainErrorDetails("ARTICLE_SLUG_EXISTS"),
        );
      }

      if (isRelationError(error)) {
        throw new ApiError(
          400,
          "VALIDATION_ERROR",
          "Article references invalid related records",
          createCmsDomainErrorDetails("ARTICLE_INVALID_RELATIONS"),
        );
      }

      throw error;
    }
  },
  async update(id: string, input: UpdateArticleInput) {
    const current = await articlesRepository.getById(id);

    if (!current) {
      throw new ApiError(404, "NOT_FOUND", "Article not found");
    }

    const normalizedInput: UpdateArticlePersistInput = {
      ...input,
      slug: input.slug ? ensureSlug(input.slug) : undefined,
      ...toUpdateExcerptPersist(input),
    };

    const nextStatus = normalizedInput.status ?? current.status;
    const nextPublishedAt =
      normalizedInput.publishedAt === undefined ? current.publishedAt : normalizedInput.publishedAt;

    assertPublishedAtConsistency(nextStatus, nextPublishedAt ?? null);

    try {
      const article = await articlesRepository.update(id, normalizedInput);
      return toArticleDto(article);
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new ApiError(404, "NOT_FOUND", "Article not found");
      }

      if (isUniqueError(error)) {
        throw new ApiError(
          409,
          "CONFLICT",
          "Article slug already exists",
          createCmsDomainErrorDetails("ARTICLE_SLUG_EXISTS"),
        );
      }

      if (isRelationError(error)) {
        throw new ApiError(
          400,
          "VALIDATION_ERROR",
          "Article references invalid related records",
          createCmsDomainErrorDetails("ARTICLE_INVALID_RELATIONS"),
        );
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
  async publish(id: string) {
    const current = await articlesRepository.getById(id);

    if (!current) {
      throw new ApiError(404, "NOT_FOUND", "Article not found");
    }

    if (current.status === "PUBLISHED" && current.publishedAt) {
      return toArticleDto(current);
    }

    try {
      const article = await articlesRepository.publish(id);
      return toArticleDto(article);
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new ApiError(404, "NOT_FOUND", "Article not found");
      }

      throw error;
    }
  },
  async unpublish(id: string) {
    const current = await articlesRepository.getById(id);

    if (!current) {
      throw new ApiError(404, "NOT_FOUND", "Article not found");
    }

    if (current.status === "DRAFT" && current.publishedAt === null) {
      return toArticleDto(current);
    }

    try {
      const article = await articlesRepository.unpublish(id);
      return toArticleDto(article);
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new ApiError(404, "NOT_FOUND", "Article not found");
      }

      throw error;
    }
  },
  async archive(id: string) {
    const current = await articlesRepository.getById(id);

    if (!current) {
      throw new ApiError(404, "NOT_FOUND", "Article not found");
    }

    if (current.status === "ARCHIVED" && current.publishedAt === null) {
      return toArticleDto(current);
    }

    try {
      const article = await articlesRepository.archive(id);
      return toArticleDto(article);
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new ApiError(404, "NOT_FOUND", "Article not found");
      }

      throw error;
    }
  },
};
