import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const printEditionsRepository = {
  async list(where: Prisma.PrintEditionWhereInput = {}) {
    return prisma.printEdition.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });
  },
  async getById(id: string) {
    return prisma.printEdition.findUnique({ where: { id } });
  },
  async create(input: Prisma.PrintEditionCreateInput) {
    return prisma.printEdition.create({ data: input });
  },
  async update(id: string, data: Prisma.PrintEditionUpdateInput) {
    return prisma.printEdition.update({ where: { id }, data });
  },
  async delete(id: string) {
    return prisma.printEdition.delete({ where: { id } });
  },
};
