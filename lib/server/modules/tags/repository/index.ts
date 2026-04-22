import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import type { PaginationParams } from "@/lib/server/http/pagination";
import type {
  CreateTagInput,
  ListTagsQuery,
  UpdateTagInput,
} from "@/lib/server/modules/tags/schema";

const toTagWhereInput = (query: ListTagsQuery): Prisma.TagWhereInput => {
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

const toTagOrderByInput = (query: ListTagsQuery): Prisma.TagOrderByWithRelationInput => {
  return { [query.sortBy]: query.sortOrder };
};

export const tagsRepository = {
  async list(query: ListTagsQuery, pagination: PaginationParams) {
    const where = toTagWhereInput(query);
    const orderBy = toTagOrderByInput(query);

    return prisma.tag.findMany({
      where,
      orderBy,
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
    });
  },
  async count(query: ListTagsQuery) {
    const where = toTagWhereInput(query);
    return prisma.tag.count({ where });
  },
  async getById(id: string) {
    return prisma.tag.findUnique({
      where: { id },
    });
  },
  async create(input: CreateTagInput) {
    return prisma.tag.create({
      data: input,
    });
  },
  async update(id: string, input: UpdateTagInput) {
    return prisma.tag.update({
      where: { id },
      data: input,
    });
  },
  async hardDelete(id: string) {
    return prisma.tag.delete({
      where: { id },
    });
  },
};
