import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import type { PaginationParams } from "@/lib/server/http/pagination";
import type {
  CreateCategoryInput,
  ListCategoriesQuery,
  UpdateCategoryInput,
} from "@/lib/server/modules/categories/schema";

const toCategoryWhereInput = (query: ListCategoriesQuery): Prisma.CategoryWhereInput => {
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

const toCategoryOrderByInput = (
  query: ListCategoriesQuery,
): Prisma.CategoryOrderByWithRelationInput => {
  return { [query.sortBy]: query.sortOrder };
};

export const categoriesRepository = {
  async list(query: ListCategoriesQuery, pagination: PaginationParams) {
    const where = toCategoryWhereInput(query);
    const orderBy = toCategoryOrderByInput(query);

    return prisma.category.findMany({
      where,
      orderBy,
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
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
  async count(query: ListCategoriesQuery) {
    const where = toCategoryWhereInput(query);
    return prisma.category.count({ where });
  },
  async getById(id: string) {
    return prisma.category.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
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
  async create(input: CreateCategoryInput) {
    return prisma.category.create({
      data: input,
    });
  },
  async update(id: string, input: UpdateCategoryInput) {
    return prisma.category.update({
      where: { id },
      data: input,
    });
  },
  async delete(id: string) {
    return prisma.category.delete({
      where: { id },
    });
  },
};
