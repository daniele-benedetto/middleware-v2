import "server-only";

import { ApiError } from "@/lib/server/http/api-error";
import { publicIssuesRepository } from "@/lib/server/modules/issues/repository/public";

import type { PaginationParams } from "@/lib/server/http/pagination";
import type {
  PublicIssueArticleSummaryDto,
  PublicIssueDetailDto,
  PublicIssueDto,
} from "@/lib/server/modules/issues/dto/public";

type PublicIssueRecord = {
  id: string;
  title: string;
  slug: string;
  description: unknown;
  publishedAt: Date | null;
  _count?: { articles: number };
};

type PublicIssueArticleRecord = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  imageUrl: string | null;
  audioUrl: string | null;
  isFeatured: boolean;
  position: number;
  publishedAt: Date | null;
  category?: { slug: string; name: string } | null;
  author?: { name: string | null } | null;
};

type PublicIssueDetailRecord = PublicIssueRecord & {
  articles?: PublicIssueArticleRecord[];
};

const toPublicIssueDto = (issue: PublicIssueRecord): PublicIssueDto => {
  if (!issue.publishedAt) {
    throw new ApiError(500, "INTERNAL_ERROR", "Public issue missing publishedAt");
  }

  return {
    id: issue.id,
    title: issue.title,
    slug: issue.slug,
    description: issue.description ?? null,
    publishedAt: issue.publishedAt.toISOString(),
    articlesCount: issue._count?.articles ?? 0,
  };
};

const toPublicIssueArticleSummaryDto = (
  article: PublicIssueArticleRecord,
): PublicIssueArticleSummaryDto => {
  if (!article.publishedAt) {
    throw new ApiError(500, "INTERNAL_ERROR", "Public article missing publishedAt");
  }

  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    imageUrl: article.imageUrl,
    hasAudio: Boolean(article.audioUrl),
    isFeatured: article.isFeatured,
    position: article.position,
    publishedAt: article.publishedAt.toISOString(),
    categorySlug: article.category?.slug ?? null,
    categoryName: article.category?.name ?? null,
    authorName: article.author?.name ?? null,
  };
};

const toPublicIssueDetailDto = (issue: PublicIssueDetailRecord): PublicIssueDetailDto => {
  return {
    ...toPublicIssueDto(issue),
    articles: (issue.articles ?? []).map(toPublicIssueArticleSummaryDto),
  };
};

export const publicIssuesService = {
  async listPublished(pagination: PaginationParams) {
    const [issues, total] = await Promise.all([
      publicIssuesRepository.listPublished(pagination),
      publicIssuesRepository.countPublished(),
    ]);

    return {
      items: issues.map(toPublicIssueDto),
      total,
    };
  },
  async getCurrent() {
    const issue = await publicIssuesRepository.getCurrent();

    if (!issue) {
      throw new ApiError(404, "NOT_FOUND", "Current issue not found");
    }

    return toPublicIssueDetailDto(issue);
  },
  async getBySlug(slug: string) {
    const issue = await publicIssuesRepository.getBySlug(slug);

    if (!issue) {
      throw new ApiError(404, "NOT_FOUND", "Issue not found");
    }

    return toPublicIssueDetailDto(issue);
  },
};
