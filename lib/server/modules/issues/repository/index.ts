import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import type { PaginationParams } from "@/lib/server/http/pagination";
import type {
  ListIssuesQuery,
  ReorderIssuesInput,
  UpdateIssueInput,
} from "@/lib/server/modules/issues/schema";

export type CreateIssuePersistInput = {
  title: string;
  slug: string;
  description?: string;
  coverUrl?: string;
  color?: string;
  isActive?: boolean;
  publishedAt?: Date | null;
};

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
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        coverUrl: true,
        color: true,
        isActive: true,
        sortOrder: true,
        publishedAt: true,
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
  async count(query: ListIssuesQuery) {
    const where = toIssueWhereInput(query);
    return prisma.issue.count({ where });
  },
  async getById(id: string) {
    return prisma.issue.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        coverUrl: true,
        color: true,
        isActive: true,
        sortOrder: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        articles: {
          select: {
            id: true,
            title: true,
            status: true,
            isFeatured: true,
            position: true,
          },
          orderBy: { position: "asc" },
        },
        _count: {
          select: {
            articles: true,
          },
        },
      },
    });
  },
  async create(input: CreateIssuePersistInput) {
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
  async delete(id: string) {
    return prisma.issue.delete({
      where: { id },
    });
  },
  async listIdsOrderedBySortOrder() {
    return prisma.issue.findMany({
      select: {
        id: true,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  },
  async reorder(input: ReorderIssuesInput) {
    return prisma.$transaction(async (tx) => {
      for (const [index, issueId] of input.orderedIssueIds.entries()) {
        await tx.issue.update({
          where: { id: issueId },
          data: {
            sortOrder: index,
          },
        });
      }

      return tx.issue.findMany({
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          coverUrl: true,
          color: true,
          isActive: true,
          sortOrder: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              articles: true,
            },
          },
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
    });
  },
};
