import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import type { PaginationParams } from "@/lib/server/http/pagination";
import type { ListPagesQuery, UpdatePageInput } from "@/lib/server/modules/pages/schema";

export type CreatePagePersistInput = {
  title: string;
  titleStyled?: unknown | null;
  slug: string;
  excerpt?: string | null;
  excerptRich?: unknown | null;
  contentRich: unknown;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedAt?: Date | null;
};

export type UpdatePagePersistInput = Omit<UpdatePageInput, "excerptRich"> & {
  excerpt?: string | null;
  excerptRich?: unknown | null;
};

const PAGE_DETAIL_SELECT = {
  id: true,
  title: true,
  titleStyled: true,
  slug: true,
  excerpt: true,
  excerptRich: true,
  status: true,
  contentRich: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.PageSelect;

const PAGE_LIST_SELECT = {
  id: true,
  title: true,
  titleStyled: true,
  slug: true,
  excerpt: true,
  status: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.PageSelect;

const toPageWhereInput = (query: ListPagesQuery): Prisma.PageWhereInput => ({
  status: query.status,
  OR: query.q
    ? [
        { title: { contains: query.q, mode: "insensitive" } },
        { slug: { contains: query.q, mode: "insensitive" } },
      ]
    : undefined,
});

const toPageOrderByInput = (query: ListPagesQuery): Prisma.PageOrderByWithRelationInput => {
  return { [query.sortBy]: query.sortOrder };
};

export const pagesRepository = {
  async list(query: ListPagesQuery, pagination: PaginationParams) {
    const where = toPageWhereInput(query);

    return prisma.page.findMany({
      where,
      orderBy: toPageOrderByInput(query),
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      select: PAGE_LIST_SELECT,
    });
  },
  async count(query: ListPagesQuery) {
    return prisma.page.count({ where: toPageWhereInput(query) });
  },
  async getById(id: string) {
    return prisma.page.findUnique({
      where: { id },
      select: PAGE_DETAIL_SELECT,
    });
  },
  async create(input: CreatePagePersistInput) {
    return prisma.page.create({
      data: {
        title: input.title,
        titleStyled:
          input.titleStyled === undefined
            ? undefined
            : (input.titleStyled as Prisma.InputJsonValue),
        slug: input.slug,
        excerpt: input.excerpt,
        excerptRich:
          input.excerptRich === undefined
            ? undefined
            : input.excerptRich === null
              ? Prisma.JsonNull
              : (input.excerptRich as Prisma.InputJsonValue),
        status: input.status,
        contentRich: input.contentRich as Prisma.InputJsonValue,
        publishedAt: input.publishedAt,
      },
      select: PAGE_DETAIL_SELECT,
    });
  },
  async update(id: string, input: UpdatePagePersistInput) {
    return prisma.page.update({
      where: { id },
      data: {
        title: input.title,
        titleStyled:
          input.titleStyled === undefined
            ? undefined
            : (input.titleStyled as Prisma.InputJsonValue),
        slug: input.slug,
        excerpt: input.excerpt,
        excerptRich:
          input.excerptRich === undefined
            ? undefined
            : input.excerptRich === null
              ? Prisma.JsonNull
              : (input.excerptRich as Prisma.InputJsonValue),
        status: input.status,
        contentRich:
          input.contentRich === undefined
            ? undefined
            : (input.contentRich as Prisma.InputJsonValue),
        publishedAt: input.publishedAt,
      },
      select: PAGE_DETAIL_SELECT,
    });
  },
  async delete(id: string) {
    return prisma.page.delete({ where: { id } });
  },
  async publish(id: string) {
    return prisma.page.update({
      where: { id },
      data: { status: "PUBLISHED", publishedAt: new Date() },
      select: PAGE_DETAIL_SELECT,
    });
  },
  async unpublish(id: string) {
    return prisma.page.update({
      where: { id },
      data: { status: "DRAFT", publishedAt: null },
      select: PAGE_DETAIL_SELECT,
    });
  },
  async archive(id: string) {
    return prisma.page.update({
      where: { id },
      data: { status: "ARCHIVED", publishedAt: null },
      select: PAGE_DETAIL_SELECT,
    });
  },
};
