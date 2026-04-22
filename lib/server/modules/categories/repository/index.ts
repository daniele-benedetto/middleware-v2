import "server-only";

import { prisma } from "@/lib/prisma";

import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/lib/server/modules/categories/schema";

export const categoriesRepository = {
  async list() {
    return prisma.category.findMany({
      orderBy: { createdAt: "desc" },
    });
  },
  async getById(id: string) {
    return prisma.category.findUnique({
      where: { id },
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
  async hardDelete(id: string) {
    return prisma.category.delete({
      where: { id },
    });
  },
};
