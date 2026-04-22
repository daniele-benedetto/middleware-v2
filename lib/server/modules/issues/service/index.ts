import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { ApiError } from "@/lib/server/http/api-error";
import { issuesRepository } from "@/lib/server/modules/issues/repository";
import { normalizeSlug } from "@/lib/server/validation/slug";

import type { IssueDto } from "@/lib/server/modules/issues/dto";
import type { CreateIssueInput, UpdateIssueInput } from "@/lib/server/modules/issues/schema";

const toIssueDto = (issue: { id: string; title: string; slug: string }): IssueDto => {
  return {
    id: issue.id,
    title: issue.title,
    slug: issue.slug,
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
  async list() {
    const issues = await issuesRepository.list();
    return issues.map(toIssueDto);
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
      return toIssueDto(issue);
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
      const issue = await issuesRepository.update(id, normalizedInput);
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
  async hardDelete(id: string) {
    try {
      await issuesRepository.hardDelete(id);
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
};
