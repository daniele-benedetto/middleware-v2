import "server-only";

import { prisma } from "@/lib/prisma";

import type { CreateIssueInput, UpdateIssueInput } from "@/lib/server/modules/issues/schema";

export const issuesRepository = {
  async list() {
    return prisma.issue.findMany({
      orderBy: { createdAt: "desc" },
    });
  },
  async getById(id: string) {
    return prisma.issue.findUnique({
      where: { id },
    });
  },
  async create(input: CreateIssueInput) {
    return prisma.issue.create({
      data: input,
    });
  },
  async update(id: string, input: UpdateIssueInput) {
    return prisma.issue.update({
      where: { id },
      data: input,
    });
  },
  async hardDelete(id: string) {
    return prisma.issue.delete({
      where: { id },
    });
  },
};
