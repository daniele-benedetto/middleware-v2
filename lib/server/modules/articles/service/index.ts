import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { ApiError } from "@/lib/server/http/api-error";
import { articlesRepository } from "@/lib/server/modules/articles/repository";
import { assertPublishedAtConsistency } from "@/lib/server/validation/published";
import { normalizeSlug } from "@/lib/server/validation/slug";

import type { ArticleStatus } from "@/lib/generated/prisma/enums";
import type { PaginationParams } from "@/lib/server/http/pagination";
import type { ArticleDetailDto, ArticleDto } from "@/lib/server/modules/articles/dto";
import type {
  CreateArticlePersistInput,
  UpdateArticlePersistInput,
} from "@/lib/server/modules/articles/repository";
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

type ArticleDetailRecord = ArticleRecord & {
  excerpt: string | null;
  excerptRich: unknown;
  contentRich: unknown;
  imageUrl: string | null;
  audioUrl: string | null;
  audioChunks: unknown;
  tags?: Array<{ tagId: string }>;
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

const toArticleDetailDto = (article: ArticleDetailRecord): ArticleDetailDto => {
  return {
    ...toArticleDto(article),
    excerpt: article.excerpt,
    excerptRich:
      article.excerptRich ??
      (article.excerpt ? createRichTextDocFromPlainText(article.excerpt) : null),
    contentRich: article.contentRich,
    imageUrl: article.imageUrl,
    audioUrl: article.audioUrl,
    audioChunks: (article.audioChunks ?? null) as ArticleDetailDto["audioChunks"],
    tagIds: (article.tags ?? []).map((relation) => relation.tagId),
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

function containsSameIds(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  const expected = new Set(left);
  return right.every((id) => expected.has(id));
}

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
  async create(input: CreateArticleInput) {
    const normalizedInput: CreateArticlePersistInput = {
      ...input,
      slug: ensureSlug(input.slug),
      ...toCreateExcerptPersist(input),
      tagIds: input.tagIds?.length ? Array.from(new Set(input.tagIds)) : undefined,
    };

    try {
      const article = await articlesRepository.create(normalizedInput);
      return toArticleDto(article);
    } catch (error) {
      if (isUniqueError(error)) {
        throw new ApiError(409, "CONFLICT", "Article slug already exists for this issue");
      }

      if (isRelationError(error)) {
        throw new ApiError(400, "VALIDATION_ERROR", "Article references invalid related records");
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
        throw new ApiError(409, "CONFLICT", "Article slug already exists for this issue");
      }

      if (isRelationError(error)) {
        throw new ApiError(400, "VALIDATION_ERROR", "Article references invalid related records");
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
    try {
      const article = await articlesRepository.syncTags(id, input);

      if (!article) {
        throw new ApiError(404, "NOT_FOUND", "Article not found");
      }

      return toArticleDto(article);
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new ApiError(404, "NOT_FOUND", "Article not found");
      }

      if (isRelationError(error)) {
        throw new ApiError(400, "VALIDATION_ERROR", "One or more tags are invalid");
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
  async feature(id: string) {
    const current = await articlesRepository.getById(id);

    if (!current) {
      throw new ApiError(404, "NOT_FOUND", "Article not found");
    }

    if (current.isFeatured) {
      return toArticleDto(current);
    }

    try {
      const article = await articlesRepository.feature(id);
      return toArticleDto(article);
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new ApiError(404, "NOT_FOUND", "Article not found");
      }

      throw error;
    }
  },
  async unfeature(id: string) {
    const current = await articlesRepository.getById(id);

    if (!current) {
      throw new ApiError(404, "NOT_FOUND", "Article not found");
    }

    if (!current.isFeatured) {
      return toArticleDto(current);
    }

    try {
      const article = await articlesRepository.unfeature(id);
      return toArticleDto(article);
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new ApiError(404, "NOT_FOUND", "Article not found");
      }

      throw error;
    }
  },
  async reorder(input: ReorderArticlesInput) {
    const currentIssueArticles = await articlesRepository.listIdsByIssue(input.issueId);

    if (currentIssueArticles.length === 0) {
      throw new ApiError(404, "NOT_FOUND", "No articles found for reorder");
    }

    const currentIds = currentIssueArticles.map((article) => article.id);

    if (!containsSameIds(currentIds, input.orderedArticleIds)) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "orderedArticleIds must include all and only articles from the target issue",
      );
    }

    const articles = await articlesRepository.reorder(input);

    if (articles.length === 0) {
      throw new ApiError(404, "NOT_FOUND", "No articles found for reorder");
    }

    return toArticlesDto(articles);
  },
};
