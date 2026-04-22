import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import type { PaginationParams } from "@/lib/server/http/pagination";
import type {
  CreateIssueInput,
  ListIssuesQuery,
  UpdateIssueInput,
} from "@/lib/server/modules/issues/schema";

const toIssueWhereInput = (query: ListIssuesQuery): Prisma.IssueWhereInput => {
  const publishedAtFilter =
    query.published === undefined ? undefined : query.published ? { not: null } : null;

  return {
    isActive: query.isActive,
    publishedAt: publishedAtFilter,
    OR: query.q
      ? [
          { title: { contains: query.q, mode: "insensitive" } },
          { slug: { contains: query.q, mode: "insensitive" } },
        ]
      : undefined,
  };
};

const toIssueOrderByInput = (query: ListIssuesQuery): Prisma.IssueOrderByWithRelationInput => {
  return { [query.sortBy]: query.sortOrder };
};

export const issuesRepository = {
  async list(query: ListIssuesQuery, pagination: PaginationParams) {
    const where = toIssueWhereInput(query);
    const orderBy = toIssueOrderByInput(query);

    return prisma.issue.findMany({
      where,
      orderBy,
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
    });
  },
  async count(query: ListIssuesQuery) {
    const where = toIssueWhereInput(query);
    return prisma.issue.count({ where });
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
