import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import type {
  CreateArticleInput,
  ReorderArticlesInput,
  SyncArticleTagsInput,
  UpdateArticleInput,
} from "@/lib/server/modules/articles/schema";

export const articlesRepository = {
  async list() {
    return prisma.article.findMany({
      orderBy: { createdAt: "desc" },
    });
  },
  async getById(id: string) {
    return prisma.article.findUnique({
      where: { id },
    });
  },
  async create(input: CreateArticleInput) {
    const data: Prisma.ArticleUncheckedCreateInput = {
      issueId: input.issueId,
      categoryId: input.categoryId,
      authorId: input.authorId,
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt,
      contentRich: input.contentRich as Prisma.InputJsonValue,
      imageUrl: input.imageUrl,
      audioUrl: input.audioUrl,
      audioChunks: input.audioChunks as Prisma.InputJsonValue | undefined,
    };

    return prisma.article.create({
      data,
    });
  },
  async update(id: string, input: UpdateArticleInput) {
    const data: Prisma.ArticleUncheckedUpdateInput = {
      issueId: input.issueId,
      categoryId: input.categoryId,
      authorId: input.authorId,
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt,
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
  async hardDelete(id: string) {
    return prisma.article.delete({
      where: { id },
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
      for (const [index, articleId] of input.orderedArticleIds.entries()) {
        await tx.article.update({
          where: { id: articleId },
          data: {
            issueId: input.issueId,
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
};
