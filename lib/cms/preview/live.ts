import { i18n } from "@/lib/i18n";
import { extractPlainText } from "@/lib/rich-text/plain-text";

import type { PublicCurrentIssueDetail, PublicIssueListItem } from "@/lib/public/types/issues";
import type {
  PublicArticleDetailDto,
  PublicArticleTagDto,
} from "@/lib/server/modules/articles/dto/public";
import type { PublicIssueArticleSummaryDto } from "@/lib/server/modules/issues/dto/public";
import type { IssueHomeBlocks, IssueTitleStyled } from "@/lib/server/modules/issues/schema";

export type ArticleLivePreviewSnapshot = {
  article: PublicArticleDetailDto;
  publicAvailable: boolean;
  statusLabel: string;
  updatedAt: string;
};

export type IssueLivePreviewSnapshot = {
  issue: PublicCurrentIssueDetail;
  publicAvailable: boolean;
  statusLabel: string;
  updatedAt: string;
};

export type ArticleLivePreviewMessage = {
  type: "article-preview";
  snapshot: ArticleLivePreviewSnapshot;
};

export type IssueLivePreviewMessage = {
  type: "issue-preview";
  snapshot: IssueLivePreviewSnapshot;
};

export type LivePreviewMessage = ArticleLivePreviewMessage | IssueLivePreviewMessage;

export type ArticleLivePreviewInput = {
  id?: string;
  issueId: string;
  issueSlug: string;
  issueTitle: string;
  categoryId: string;
  categorySlug?: string;
  categoryName: string;
  authorId: string | null;
  authorName: string | null;
  title: string;
  titleStyled: IssueTitleStyled | null;
  slug: string;
  excerptRich: unknown;
  contentRich: unknown;
  imageUrl: string | null;
  imageAlt: string | null;
  audioUrl: string | null;
  audioChunks: unknown;
  tags: PublicArticleTagDto[];
  statusLabel: string;
  publicAvailable: boolean;
};

export type IssueLivePreviewInput = {
  id?: string;
  title: string;
  titleStyled: IssueTitleStyled | null;
  slug: string;
  description: unknown;
  homeBlocks: IssueHomeBlocks | null;
  articles: PublicIssueArticleSummaryDto[];
  publishedIssues?: PublicIssueListItem[];
  statusLabel: string;
  publicAvailable: boolean;
};

const PREVIEW_UUID = "00000000-0000-4000-8000-000000000000";

export function getLivePreviewChannel(resource: "article" | "issue", sessionId: string) {
  return `cms-preview:${resource}:${sessionId}`;
}

export function getLivePreviewStorageKey(resource: "article" | "issue", sessionId: string) {
  return `${getLivePreviewChannel(resource, sessionId)}:snapshot`;
}

export function createLivePreviewSessionId() {
  return crypto.randomUUID();
}

export function getFallbackPreviewDate() {
  return new Date().toISOString();
}

export function toArticleLivePreviewSnapshot(
  input: ArticleLivePreviewInput,
): ArticleLivePreviewSnapshot {
  const now = getFallbackPreviewDate();
  const title = input.title.trim() || i18n.cms.forms.resources.articles.untitledPreviewTitle;
  const slug = input.slug.trim() || "anteprima-articolo";
  const excerpt = extractPlainText(input.excerptRich);

  return {
    article: {
      id: input.id ?? PREVIEW_UUID,
      slug,
      title,
      titleStyled: input.titleStyled,
      excerpt,
      imageUrl: input.imageUrl,
      imageAlt: input.imageAlt,
      hasAudio: Boolean(input.audioUrl),
      isFeatured: false,
      publishedAt: now,
      issueId: input.issueId || PREVIEW_UUID,
      issueSlug: input.issueSlug || "anteprima-uscita",
      issueTitle: input.issueTitle || i18n.cms.forms.resources.articles.previewIssueTitle,
      categoryId: input.categoryId || PREVIEW_UUID,
      categorySlug: input.categorySlug || "anteprima",
      categoryName: input.categoryName || i18n.cms.forms.resources.articles.previewCategoryName,
      authorId: input.authorId,
      authorName: input.authorName,
      tagsCount: input.tags.length,
      excerptRich: input.excerptRich,
      contentRich: input.contentRich,
      audioUrl: input.audioUrl,
      audioChunks: input.audioChunks ?? null,
      updatedAt: now,
      tags: input.tags,
    },
    publicAvailable: input.publicAvailable,
    statusLabel: input.statusLabel,
    updatedAt: now,
  };
}

export function toIssueLivePreviewSnapshot(input: IssueLivePreviewInput): IssueLivePreviewSnapshot {
  const now = getFallbackPreviewDate();
  const title = input.title.trim() || i18n.cms.forms.resources.issues.untitledPreviewTitle;
  const slug = input.slug.trim() || "anteprima-uscita";
  const issue: PublicCurrentIssueDetail = {
    id: input.id ?? PREVIEW_UUID,
    title,
    titleStyled: input.titleStyled,
    slug,
    description: input.description ?? null,
    homeBlocks: input.homeBlocks,
    publishedAt: now,
    articlesCount: input.articles.length,
    articles: input.articles,
  };

  return {
    issue,
    publicAvailable: input.publicAvailable,
    statusLabel: input.statusLabel,
    updatedAt: now,
  };
}
