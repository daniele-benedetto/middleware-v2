import "server-only";

import { resolvePublicMediaUrl } from "@/lib/media/blob";
import { extractPlainText } from "@/lib/rich-text/plain-text";
import { ApiError } from "@/lib/server/http/api-error";
import { publicIssuesRepository } from "@/lib/server/modules/issues/repository/public";
import { issueHomeBlocksSchema } from "@/lib/server/modules/issues/schema";

import type { PaginationParams } from "@/lib/server/http/pagination";
import type {
  PublicIssueArticleSummaryDto,
  PublicIssueDetailDto,
  PublicIssueDto,
} from "@/lib/server/modules/issues/dto/public";
import type { IssueHomeBlocks, IssueTitleStyled } from "@/lib/server/modules/issues/schema";

type PublicIssueRecord = {
  id: string;
  title: string;
  titleStyled: unknown;
  slug: string;
  description: unknown;
  homeBlocks: unknown;
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
  imageAlt: string | null;
  audioUrl: string | null;
  isFeatured: boolean;
  contentRich: unknown;
  publishedAt: Date | null;
  category?: { slug: string; name: string } | null;
  author?: { name: string | null } | null;
  tags?: Array<{ tag: { id: string; slug: string; name: string } }>;
};

const WORDS_PER_MINUTE = 220;

const calculateReadingTimeMinutes = (contentRich: unknown) => {
  const text = extractPlainText(contentRich);
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
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
    homeBlocks: normalizeIssueHomeBlocks(issue.homeBlocks),
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
    imageAlt: article.imageAlt,
    hasAudio: Boolean(article.audioUrl),
    isFeatured: article.isFeatured,
    readingTimeMinutes: calculateReadingTimeMinutes(article.contentRich),
    publishedAt: article.publishedAt.toISOString(),
    categorySlug: article.category?.slug ?? null,
    categoryName: article.category?.name ?? null,
    authorName: article.author?.name ?? null,
    tags: (article.tags ?? []).map((relation) => relation.tag),
  };
};

const toPublicIssueDetailDto = (issue: PublicIssueDetailRecord): PublicIssueDetailDto => {
  return {
    ...toPublicIssueDto(issue),
    articles: (issue.articles ?? []).map(toPublicIssueArticleSummaryDto),
  };
};

export const publicIssuesService = {
  async listPublishedItems(pagination: PaginationParams) {
    const issues = await publicIssuesRepository.listPublished(pagination);
    return issues.map(toPublicIssueDto);
  },
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
