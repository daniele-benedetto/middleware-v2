import "server-only";

import { prisma } from "@/lib/prisma";

import type { CreateTagInput, UpdateTagInput } from "@/lib/server/modules/tags/schema";

export const tagsRepository = {
  async list() {
    return prisma.tag.findMany({
      orderBy: { createdAt: "desc" },
    });
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
