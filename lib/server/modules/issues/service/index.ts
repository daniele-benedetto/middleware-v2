import "server-only";

import { createCmsDomainErrorDetails } from "@/lib/cms/errors/domain-error-details";
import { Prisma } from "@/lib/generated/prisma/client";
import { ApiError } from "@/lib/server/http/api-error";
import {
  ISSUE_ARTICLE_ORDER_MISMATCH,
  issuesRepository,
} from "@/lib/server/modules/issues/repository";
import { normalizeSlug } from "@/lib/server/validation/slug";

import type { ArticleStatus } from "@/lib/generated/prisma/enums";
import type { PaginationParams } from "@/lib/server/http/pagination";
import type { IssueDetailDto, IssueDto } from "@/lib/server/modules/issues/dto";
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
  description: unknown;
  isActive: boolean;
  sortOrder: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { articles: number };
};

type IssueDetailRecord = IssueRecord & {
  articles?: Array<{
    id: string;
    title: string;
    status: ArticleStatus;
    isFeatured: boolean;
    position: number;
  }>;
};

const toIssueDto = (issue: IssueRecord): IssueDto => {
  return {
    id: issue.id,
    title: issue.title,
    slug: issue.slug,
    description: issue.description ?? null,
    isActive: issue.isActive,
    sortOrder: issue.sortOrder,
    publishedAt: issue.publishedAt?.toISOString() ?? null,
    createdAt: issue.createdAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString(),
    articlesCount: issue._count?.articles ?? 0,
  };
};

const toIssueDetailDto = (issue: IssueDetailRecord): IssueDetailDto => {
  return {
    ...toIssueDto(issue),
    articles: (issue.articles ?? []).map((article) => ({
      id: article.id,
      title: article.title,
      status: article.status,
      isFeatured: article.isFeatured,
      position: article.position,
    })),
  };
};

const ensureSlug = (value: string): string => {
  const slug = normalizeSlug(value);

  if (!slug) {
    throw new ApiError(400, "VALIDATION_ERROR", "Slug is required");
  }

  return slug;
};

const SLUG_SUFFIX_MAX_ATTEMPTS = 100;

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

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

    return toIssueDetailDto(issue as IssueDetailRecord);
  },
  async create(input: CreateIssueInput) {
    const baseSlug = ensureSlug(input.slug ?? input.title);

    for (let attempt = 0; attempt < SLUG_SUFFIX_MAX_ATTEMPTS; attempt += 1) {
      const candidateSlug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt}`;

      try {
        const issue = await issuesRepository.create({
          title: input.title,
          slug: candidateSlug,
          description: input.description,
          isActive: input.isActive,
          publishedAt: input.publishedAt ?? null,
        });
        const issueWithCount = await issuesRepository.getById(issue.id);

        if (!issueWithCount) {
          throw new ApiError(404, "NOT_FOUND", "Issue not found");
        }

        return toIssueDto(issueWithCount);
      } catch (error) {
        if (isUniqueViolation(error)) {
          continue;
        }

        throw error;
      }
    }

    throw new ApiError(
      409,
      "CONFLICT",
      "Issue slug already exists",
      createCmsDomainErrorDetails("ISSUE_SLUG_EXISTS"),
    );
  },
  async update(id: string, input: UpdateIssueInput, orderedArticleIds?: string[]) {
    const normalizedInput: UpdateIssueInput = {
      ...input,
      slug: input.slug ? ensureSlug(input.slug) : undefined,
    };

    try {
      await issuesRepository.updateWithArticleOrder(id, normalizedInput, orderedArticleIds);
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
        throw new ApiError(
          409,
          "CONFLICT",
          "Issue slug already exists",
          createCmsDomainErrorDetails("ISSUE_SLUG_EXISTS"),
        );
      }

      if (error instanceof Error && error.message === ISSUE_ARTICLE_ORDER_MISMATCH) {
        throw new ApiError(
          400,
          "VALIDATION_ERROR",
          "orderedArticleIds must include all and only articles from the target issue",
          createCmsDomainErrorDetails("ISSUE_ARTICLE_ORDER_MISMATCH"),
        );
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
        throw new ApiError(
          409,
          "CONFLICT",
          "Issue cannot be deleted due to related records",
          createCmsDomainErrorDetails("ISSUE_DELETE_HAS_ARTICLES"),
        );
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
