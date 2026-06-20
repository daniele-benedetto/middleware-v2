import "server-only";

import { resolvePublicMediaUrl } from "@/lib/media/blob";
import { extractPlainText } from "@/lib/rich-text/plain-text";
import { ApiError } from "@/lib/server/http/api-error";
import { publicIssuesRepository } from "@/lib/server/modules/issues/repository/public";

import type { PaginationParams } from "@/lib/server/http/pagination";
import type {
  PublicIssueArticleSummaryDto,
  PublicIssueDetailDto,
  PublicIssueDto,
} from "@/lib/server/modules/issues/dto/public";
import type { IssueHomeLayout, IssueTitleStyled } from "@/lib/server/modules/issues/schema";

type PublicIssueRecord = {
  id: string;
  title: string;
  titleStyled: unknown;
  slug: string;
  description: unknown;
  homeLayout: IssueHomeLayout;
  publishedAt: Date | null;
  _count?: { articles: number };
};

type PublicIssueArticleRecord = {
  id: string;
  slug: string;
  title: string;
  titleStyled: unknown;
  excerpt: string | null;
  imageUrl: string | null;
  audioUrl: string | null;
  isFeatured: boolean;
  position: number;
  contentRich: unknown;
  publishedAt: Date | null;
  category?: { slug: string; name: string } | null;
  author?: { name: string | null } | null;
};

const WORDS_PER_MINUTE = 220;

const calculateReadingTimeMinutes = (contentRich: unknown) => {
  const text = extractPlainText(contentRich);
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
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
    titleStyled: (issue.titleStyled as IssueTitleStyled | null) ?? null,
    slug: issue.slug,
    description: issue.description ?? null,
    homeLayout: issue.homeLayout,
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
    titleStyled: (article.titleStyled as IssueTitleStyled | null) ?? null,
    excerpt: article.excerpt,
    imageUrl: resolvePublicMediaUrl(article.imageUrl),
    hasAudio: Boolean(article.audioUrl),
    isFeatured: article.isFeatured,
    position: article.position,
    readingTimeMinutes: calculateReadingTimeMinutes(article.contentRich),
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
