import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import type { PaginationParams } from "@/lib/server/http/pagination";
import type { ListAuthorsQuery, UpdateAuthorInput } from "@/lib/server/modules/authors/schema";

export type CreateAuthorPersistInput = {
  name: string;
  slug: string;
  bioRich?: unknown;
  isActive?: boolean;
};

const toAuthorWhereInput = (query: ListAuthorsQuery): Prisma.AuthorWhereInput => {
  return {
    isActive: query.isActive,
    OR: query.q
      ? [
          { name: { contains: query.q, mode: "insensitive" } },
          { slug: { contains: query.q, mode: "insensitive" } },
        ]
      : undefined,
  };
};

const toAuthorOrderByInput = (query: ListAuthorsQuery): Prisma.AuthorOrderByWithRelationInput => {
  return { [query.sortBy]: query.sortOrder };
};

export const authorsRepository = {
  async list(query: ListAuthorsQuery, pagination: PaginationParams) {
    const where = toAuthorWhereInput(query);
    const orderBy = toAuthorOrderByInput(query);

    return prisma.author.findMany({
      where,
      orderBy,
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      select: {
        id: true,
        name: true,
        slug: true,
        bioRich: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            articles: true,
          },
        },
      },
    });
  },
  async count(query: ListAuthorsQuery) {
    const where = toAuthorWhereInput(query);
    return prisma.author.count({ where });
  },
  async getById(id: string) {
    return prisma.author.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        bioRich: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        articles: {
          select: {
            id: true,
            title: true,
            status: true,
          },
          orderBy: [{ issueId: "asc" }, { publishedAt: "asc" }, { createdAt: "asc" }],
        },
        _count: {
          select: {
            articles: true,
          },
        },
      },
    });
  },
  async create(input: CreateAuthorPersistInput) {
    const data: Prisma.AuthorUncheckedCreateInput = {
      name: input.name,
      slug: input.slug,
      bioRich: input.bioRich === undefined ? undefined : (input.bioRich as Prisma.InputJsonValue),
      isActive: input.isActive,
    };

    return prisma.author.create({ data });
  },
  async update(id: string, input: UpdateAuthorInput) {
    const data: Prisma.AuthorUncheckedUpdateInput = {
      name: input.name,
      slug: input.slug,
      bioRich:
        input.bioRich === undefined
          ? undefined
          : input.bioRich === null
            ? Prisma.JsonNull
            : (input.bioRich as Prisma.InputJsonValue),
      isActive: input.isActive,
    };

    return prisma.author.update({
      where: { id },
      data,
    });
  },
  async delete(id: string) {
    return prisma.author.delete({
      where: { id },
    });
  },
};
