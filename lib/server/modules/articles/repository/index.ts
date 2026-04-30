import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import type { PaginationParams } from "@/lib/server/http/pagination";
import type {
  ListArticlesQuery,
  ReorderArticlesInput,
  SyncArticleTagsInput,
  UpdateArticleInput,
} from "@/lib/server/modules/articles/schema";

export type CreateArticlePersistInput = {
  issueId: string;
  categoryId: string;
  authorId: string;
  title: string;
  slug: string;
  excerpt?: string;
  excerptRich?: unknown;
  contentRich: unknown;
  imageUrl?: string;
  audioUrl?: string;
  audioChunks?: unknown;
  tagIds?: string[];
};

export type UpdateArticlePersistInput = UpdateArticleInput & {
  excerpt?: string | null;
  excerptRich?: unknown | null;
};

const toArticleWhereInput = (query: ListArticlesQuery): Prisma.ArticleWhereInput => {
  return {
    status: query.status,
    issueId: query.issueId,
    categoryId: query.categoryId,
    authorId: query.authorId,
    isFeatured: query.featured,
    OR: query.q
      ? [
          { title: { contains: query.q, mode: "insensitive" } },
          { excerpt: { contains: query.q, mode: "insensitive" } },
        ]
      : undefined,
  };
};

const toArticleOrderByInput = (
  query: ListArticlesQuery,
): Prisma.ArticleOrderByWithRelationInput => {
  return { [query.sortBy]: query.sortOrder };
};

export const articlesRepository = {
  async list(query: ListArticlesQuery, pagination: PaginationParams) {
    const where = toArticleWhereInput(query);
    const orderBy = toArticleOrderByInput(query);

    return prisma.article.findMany({
      where,
      orderBy,
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      select: {
        id: true,
        issueId: true,
        categoryId: true,
        authorId: true,
        title: true,
        slug: true,
        status: true,
        publishedAt: true,
        isFeatured: true,
        position: true,
        createdAt: true,
        updatedAt: true,
        issue: {
          select: {
            title: true,
          },
        },
        category: {
          select: {
            name: true,
          },
        },
        author: {
          select: {
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            tags: true,
          },
        },
      },
    });
  },
  async count(query: ListArticlesQuery) {
    const where = toArticleWhereInput(query);
    return prisma.article.count({ where });
  },
  async getById(id: string) {
    return prisma.article.findUnique({
      where: { id },
      select: {
        id: true,
        issueId: true,
        categoryId: true,
        authorId: true,
        title: true,
        slug: true,
        status: true,
        publishedAt: true,
        isFeatured: true,
        position: true,
        createdAt: true,
        updatedAt: true,
        excerpt: true,
        excerptRich: true,
        contentRich: true,
        imageUrl: true,
        audioUrl: true,
        audioChunks: true,
        issue: {
          select: {
            title: true,
          },
        },
        category: {
          select: {
            name: true,
          },
        },
        author: {
          select: {
            name: true,
            email: true,
          },
        },
        tags: {
          select: {
            tagId: true,
          },
        },
        _count: {
          select: {
            tags: true,
          },
        },
      },
    });
  },
  async create(input: CreateArticlePersistInput) {
    const data: Prisma.ArticleUncheckedCreateInput = {
      issueId: input.issueId,
      categoryId: input.categoryId,
      authorId: input.authorId,
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt,
      excerptRich:
        input.excerptRich === undefined ? undefined : (input.excerptRich as Prisma.InputJsonValue),
      contentRich: input.contentRich as Prisma.InputJsonValue,
      imageUrl: input.imageUrl,
      audioUrl: input.audioUrl,
      audioChunks: input.audioChunks as Prisma.InputJsonValue | undefined,
    };

    const tagIds = Array.from(new Set(input.tagIds ?? []));

    return prisma.$transaction(async (tx) => {
      const article = await tx.article.create({
        data,
      });

      if (tagIds.length > 0) {
        await tx.articleTag.createMany({
          data: tagIds.map((tagId) => ({ articleId: article.id, tagId })),
        });
      }

      return article;
    });
  },
  async update(id: string, input: UpdateArticlePersistInput) {
    const data: Prisma.ArticleUncheckedUpdateInput = {
      issueId: input.issueId,
      categoryId: input.categoryId,
      authorId: input.authorId,
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt,
      excerptRich:
        input.excerptRich === undefined
          ? undefined
          : input.excerptRich === null
            ? Prisma.JsonNull
            : (input.excerptRich as Prisma.InputJsonValue),
      contentRich:
        input.contentRich === undefined ? undefined : (input.contentRich as Prisma.InputJsonValue),
      imageUrl: input.imageUrl,
      audioUrl: input.audioUrl,
      audioChunks:
        input.audioChunks === undefined
          ? undefined
          : input.audioChunks === null
            ? Prisma.JsonNull
            : (input.audioChunks as Prisma.InputJsonValue),
      status: input.status,
      publishedAt: input.publishedAt,
      isFeatured: input.isFeatured,
      position: input.position,
    };

    return prisma.article.update({
      where: { id },
      data,
    });
  },
  async delete(id: string) {
    return prisma.article.delete({
      where: { id },
    });
  },
  async listIdsByIssue(issueId: string) {
    return prisma.article.findMany({
      where: { issueId },
      select: { id: true },
      orderBy: { position: "asc" },
    });
  },
  async syncTags(id: string, input: SyncArticleTagsInput) {
    const tagIds = Array.from(new Set(input.tagIds));

    return prisma.$transaction(async (tx) => {
      await tx.articleTag.deleteMany({
        where: { articleId: id },
      });

      if (tagIds.length > 0) {
        await tx.articleTag.createMany({
          data: tagIds.map((tagId) => ({ articleId: id, tagId })),
        });
      }

      return tx.article.findUnique({
        where: { id },
      });
    });
  },
  async publish(id: string) {
    return prisma.article.update({
      where: { id },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
  },
  async unpublish(id: string) {
    return prisma.article.update({
      where: { id },
      data: {
        status: "DRAFT",
        publishedAt: null,
      },
    });
  },
  async archive(id: string) {
    return prisma.article.update({
      where: { id },
      data: {
        status: "ARCHIVED",
        publishedAt: null,
      },
    });
  },
  async feature(id: string) {
    return prisma.article.update({
      where: { id },
      data: {
        isFeatured: true,
      },
    });
  },
  async unfeature(id: string) {
    return prisma.article.update({
      where: { id },
      data: {
        isFeatured: false,
      },
    });
  },
  async reorder(input: ReorderArticlesInput) {
    return prisma.$transaction(async (tx) => {
      const currentIssueArticles = await tx.article.findMany({
        where: { issueId: input.issueId },
        select: { id: true },
        orderBy: { position: "asc" },
      });

      const currentOrder = currentIssueArticles.map((article) => article.id);
      const isSameOrder =
        currentOrder.length === input.orderedArticleIds.length &&
        currentOrder.every((articleId, index) => articleId === input.orderedArticleIds[index]);

      if (isSameOrder) {
        return tx.article.findMany({
          where: { issueId: input.issueId },
          orderBy: { position: "asc" },
        });
      }

      for (const [index, articleId] of input.orderedArticleIds.entries()) {
        await tx.article.update({
          where: { id: articleId },
          data: {
            position: index,
          },
        });
      }

      return tx.article.findMany({
        where: { issueId: input.issueId },
        orderBy: { position: "asc" },
      });
    });
  },
  async listMediaReferences(urls: string[]) {
    if (urls.length === 0) {
      return [];
    }

    return prisma.article.findMany({
      where: {
        OR: [
          { imageUrl: { in: urls } },
          { audioUrl: { in: urls } },
          ...urls.map((url) => ({ audioChunks: { equals: url } })),
        ],
      },
      select: {
        id: true,
        title: true,
        imageUrl: true,
        audioUrl: true,
        audioChunks: true,
      },
    });
  },
  async replaceMediaUrl(currentUrl: string, nextUrl: string) {
    if (currentUrl === nextUrl) {
      return [];
    }

    return prisma.$transaction(async (tx) => {
      const impactedArticles = await tx.article.findMany({
        where: {
          OR: [
            { imageUrl: currentUrl },
            { audioUrl: currentUrl },
            { audioChunks: { equals: currentUrl } },
          ],
        },
        select: { id: true },
      });

      await Promise.all([
        tx.article.updateMany({
          where: { imageUrl: currentUrl },
          data: { imageUrl: nextUrl },
        }),
        tx.article.updateMany({
          where: { audioUrl: currentUrl },
          data: { audioUrl: nextUrl },
        }),
        tx.article.updateMany({
          where: { audioChunks: { equals: currentUrl } },
          data: { audioChunks: nextUrl },
        }),
      ]);

      return [...new Set(impactedArticles.map((article) => article.id))];
    });
  },
  async clearMediaUrl(url: string) {
    return prisma.$transaction(async (tx) => {
      const impactedArticles = await tx.article.findMany({
        where: {
          OR: [{ imageUrl: url }, { audioUrl: url }, { audioChunks: { equals: url } }],
        },
        select: { id: true },
      });

      await Promise.all([
        tx.article.updateMany({
          where: { imageUrl: url },
          data: { imageUrl: null },
        }),
        tx.article.updateMany({
          where: { audioUrl: url },
          data: { audioUrl: null },
        }),
        tx.article.updateMany({
          where: { audioChunks: { equals: url } },
          data: { audioChunks: Prisma.JsonNull },
        }),
      ]);

      return [...new Set(impactedArticles.map((article) => article.id))];
    });
  },
};
