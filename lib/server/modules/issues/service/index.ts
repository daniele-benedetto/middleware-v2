import "server-only";

import { createCmsDomainErrorDetails } from "@/lib/cms/errors/domain-error-details";
import { Prisma } from "@/lib/generated/prisma/client";
import { resolvePublicMediaUrl } from "@/lib/media/blob";
import { extractPlainText } from "@/lib/rich-text/plain-text";
import { ApiError } from "@/lib/server/http/api-error";
import { issuesRepository } from "@/lib/server/modules/issues/repository";
import { issueHomeBlocksSchema } from "@/lib/server/modules/issues/schema";
import { normalizeSlug } from "@/lib/server/validation/slug";

import type { ArticleStatus } from "@/lib/generated/prisma/enums";
import type { PaginationParams } from "@/lib/server/http/pagination";
import type { IssueDetailDto, IssueDto } from "@/lib/server/modules/issues/dto";
import type { PublicIssueDetailDto } from "@/lib/server/modules/issues/dto/public";
import type {
  CreateIssueInput,
  IssueHomeBlocks,
  IssueTitleStyled,
  ListIssuesQuery,
  ReorderIssuesInput,
  UpdateIssueInput,
} from "@/lib/server/modules/issues/schema";

type IssueRecord = {
  id: string;
  title: string;
  titleStyled: unknown;
  slug: string;
  description: unknown;
  homeBlocks: unknown;
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
    category: {
      name: string;
      slug: string;
    } | null;
  }>;
};

type IssuePreviewRecord = IssueRecord & {
  articles?: Array<{
    id: string;
    slug: string;
    title: string;
    titleStyled: unknown;
    excerpt: string | null;
    imageUrl: string | null;
    imageAlt: string | null;
    audioUrl: string | null;
    isFeatured: boolean;
    contentRich: unknown;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    category: {
      name: string;
      slug: string;
    } | null;
    author: {
      name: string | null;
    } | null;
    tags?: Array<{ tag: { id: string; slug: string; name: string } }>;
  }>;
};

const WORDS_PER_MINUTE = 220;

const calculateReadingTimeMinutes = (contentRich: unknown) => {
  const text = extractPlainText(contentRich);
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
};

const toIssueDto = (issue: IssueRecord): IssueDto => {
  return {
    id: issue.id,
    title: issue.title,
    titleStyled: (issue.titleStyled as IssueTitleStyled | null) ?? null,
    slug: issue.slug,
    description: issue.description ?? null,
    homeBlocks: normalizeIssueHomeBlocks(issue.homeBlocks),
    isActive: issue.isActive,
    sortOrder: issue.sortOrder,
    publishedAt: issue.publishedAt?.toISOString() ?? null,
    createdAt: issue.createdAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString(),
    articlesCount: issue._count?.articles ?? 0,
  };
};

const normalizeIssueHomeBlocks = (value: unknown): IssueHomeBlocks | null => {
  if (!value) {
    return null;
  }

  const blocks = Array.isArray(value)
    ? value.map((block) => {
        if (!block || typeof block !== "object" || "variant" in block) {
          return block;
        }

        return { ...block, variant: "black" };
      })
    : value;

  return issueHomeBlocksSchema.parse(blocks);
};

const toIssueDetailDto = (issue: IssueDetailRecord): IssueDetailDto => {
  return {
    ...toIssueDto(issue),
    articles: (issue.articles ?? []).map((article) => ({
      id: article.id,
      title: article.title,
      status: article.status,
      isFeatured: article.isFeatured,
      categoryName: article.category?.name ?? null,
      categorySlug: article.category?.slug ?? null,
    })),
  };
};

const toPreviewPublishedAt = (publishedAt: Date | null, fallback: Date) => {
  return (publishedAt ?? fallback).toISOString();
};

const toPublicIssuePreviewDto = (issue: IssuePreviewRecord): PublicIssueDetailDto => {
  return {
    id: issue.id,
    title: issue.title,
    titleStyled: (issue.titleStyled as IssueTitleStyled | null) ?? null,
    slug: issue.slug,
    description: issue.description ?? null,
    homeBlocks: normalizeIssueHomeBlocks(issue.homeBlocks),
    publishedAt: toPreviewPublishedAt(issue.publishedAt, issue.updatedAt),
    articlesCount: issue._count?.articles ?? 0,
    articles: (issue.articles ?? []).map((article) => ({
      id: article.id,
      slug: article.slug,
      title: article.title,
      titleStyled: (article.titleStyled as IssueTitleStyled | null) ?? null,
      excerpt: article.excerpt,
      imageUrl: resolvePublicMediaUrl(article.imageUrl),
      imageAlt: article.imageAlt,
      hasAudio: Boolean(article.audioUrl),
      isFeatured: article.isFeatured,
      readingTimeMinutes: calculateReadingTimeMinutes(article.contentRich),
      publishedAt: toPreviewPublishedAt(article.publishedAt, article.updatedAt),
      categorySlug: article.category?.slug ?? null,
      categoryName: article.category?.name ?? null,
      authorName: article.author?.name ?? null,
      tags: (article.tags ?? []).map((relation) => relation.tag),
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
  async getPreviewById(id: string) {
    const issue = await issuesRepository.getPreviewById(id);

    if (!issue) {
      throw new ApiError(404, "NOT_FOUND", "Issue not found");
    }

    return toPublicIssuePreviewDto(issue as IssuePreviewRecord);
  },
  async create(input: CreateIssueInput) {
    const baseSlug = ensureSlug(input.slug ?? input.title);

    for (let attempt = 0; attempt < SLUG_SUFFIX_MAX_ATTEMPTS; attempt += 1) {
      const candidateSlug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt}`;

      try {
        const issue = await issuesRepository.create({
          title: input.title,
          titleStyled: input.titleStyled ?? null,
          slug: candidateSlug,
          description: input.description,
          homeBlocks: input.homeBlocks ?? null,
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
  async update(id: string, input: UpdateIssueInput) {
    const normalizedInput: UpdateIssueInput = {
      ...input,
      slug: input.slug ? ensureSlug(input.slug) : undefined,
    };

    try {
      await issuesRepository.updateWithArticleOrder(id, normalizedInput);
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
