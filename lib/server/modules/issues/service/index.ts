import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { ApiError } from "@/lib/server/http/api-error";
import { issuesRepository } from "@/lib/server/modules/issues/repository";
import { normalizeSlug } from "@/lib/server/validation/slug";

import type { PaginationParams } from "@/lib/server/http/pagination";
import type { IssueDto } from "@/lib/server/modules/issues/dto";
import type {
  CreateIssueInput,
  ListIssuesQuery,
  ReorderIssuesInput,
  UpdateIssueInput,
} from "@/lib/server/modules/issues/schema";

type IssueRecord = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  color: string | null;
  isActive: boolean;
  sortOrder: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { articles: number };
};

const toIssueDto = (issue: IssueRecord): IssueDto => {
  return {
    id: issue.id,
    title: issue.title,
    slug: issue.slug,
    description: issue.description,
    coverUrl: issue.coverUrl,
    color: issue.color,
    isActive: issue.isActive,
    sortOrder: issue.sortOrder,
    publishedAt: issue.publishedAt?.toISOString() ?? null,
    createdAt: issue.createdAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString(),
    articlesCount: issue._count?.articles ?? 0,
  };
};

const ensureSlug = (value: string): string => {
  const slug = normalizeSlug(value);

  if (!slug) {
    throw new ApiError(400, "VALIDATION_ERROR", "Slug is required");
  }

  return slug;
};

export const issuesService = {
  async list(query: ListIssuesQuery, pagination: PaginationParams) {
    const [issues, total] = await Promise.all([
      issuesRepository.list(query, pagination),
      issuesRepository.count(query),
    ]);

    return {
      items: issues.map(toIssueDto),
      total,
    };
  },
  async getById(id: string) {
    const issue = await issuesRepository.getById(id);

    if (!issue) {
      throw new ApiError(404, "NOT_FOUND", "Issue not found");
    }

    return toIssueDto(issue);
  },
  async create(input: CreateIssueInput) {
    const normalizedInput = {
      ...input,
      slug: ensureSlug(input.slug),
    };

    try {
      const issue = await issuesRepository.create(normalizedInput);
      const issueWithCount = await issuesRepository.getById(issue.id);

      if (!issueWithCount) {
        throw new ApiError(404, "NOT_FOUND", "Issue not found");
      }

      return toIssueDto(issueWithCount);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ApiError(409, "CONFLICT", "Issue slug already exists");
      }

      throw error;
    }
  },
  async update(id: string, input: UpdateIssueInput) {
    const normalizedInput: UpdateIssueInput = {
      ...input,
      slug: input.slug ? ensureSlug(input.slug) : undefined,
    };

    try {
      await issuesRepository.update(id, normalizedInput);
      const issue = await issuesRepository.getById(id);

      if (!issue) {
        throw new ApiError(404, "NOT_FOUND", "Issue not found");
      }

      return toIssueDto(issue);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new ApiError(404, "NOT_FOUND", "Issue not found");
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ApiError(409, "CONFLICT", "Issue slug already exists");
      }

      throw error;
    }
  },
  async delete(id: string) {
    try {
      await issuesRepository.delete(id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new ApiError(404, "NOT_FOUND", "Issue not found");
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new ApiError(409, "CONFLICT", "Issue cannot be deleted due to related records");
      }

      throw error;
    }
  },
  async reorder(input: ReorderIssuesInput) {
    const current = await issuesRepository.listIdsOrderedBySortOrder();

    if (current.length === 0) {
      throw new ApiError(404, "NOT_FOUND", "No issues found for reorder");
    }

    const currentIds = current.map((issue) => issue.id);
    const expected = new Set(currentIds);
    const received = new Set(input.orderedIssueIds);

    const sameLength = input.orderedIssueIds.length === currentIds.length;
    const sameElements =
      sameLength &&
      currentIds.every((id) => received.has(id)) &&
      input.orderedIssueIds.every((id) => expected.has(id));

    if (!sameElements) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "orderedIssueIds must include all and only existing issues",
      );
    }

    const reordered = await issuesRepository.reorder(input);

    return reordered.map(toIssueDto);
  },
};
