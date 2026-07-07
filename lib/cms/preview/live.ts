import { i18n } from "@/lib/i18n";
import { extractPlainText } from "@/lib/rich-text/plain-text";

import type { PublicCurrentIssueDetail, PublicIssueListItem } from "@/lib/public/types/issues";
import type {
  PublicArticleDetailDto,
  PublicArticleTagDto,
} from "@/lib/server/modules/articles/dto/public";
import type {
  PublicCourseDetailDto,
  PublicCourseLessonSummaryDto,
} from "@/lib/server/modules/courses/dto/public";
import type { PublicIssueArticleSummaryDto } from "@/lib/server/modules/issues/dto/public";
import type {
  IssueHomeBlocks,
  IssueHomeVariant,
  IssueTitleStyled,
} from "@/lib/server/modules/issues/schema";
import type { PublicLessonDetailDto } from "@/lib/server/modules/lessons/dto/public";

type LivePreviewResource = "article" | "issue" | "course" | "lesson";

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

export type CourseLivePreviewSnapshot = {
  course: PublicCourseDetailDto;
  publicAvailable: boolean;
  statusLabel: string;
  updatedAt: string;
};

export type LessonLivePreviewSnapshot = {
  lesson: PublicLessonDetailDto;
  publicAvailable: boolean;
  statusLabel: string;
  updatedAt: string;
};

export type CourseLivePreviewMessage = {
  type: "course-preview";
  snapshot: CourseLivePreviewSnapshot;
};

export type LessonLivePreviewMessage = {
  type: "lesson-preview";
  snapshot: LessonLivePreviewSnapshot;
};

export type LivePreviewMessage =
  | ArticleLivePreviewMessage
  | IssueLivePreviewMessage
  | CourseLivePreviewMessage
  | LessonLivePreviewMessage;

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
  homeVariant: IssueHomeVariant;
  articles: PublicIssueArticleSummaryDto[];
  publishedIssues?: PublicIssueListItem[];
  statusLabel: string;
  publicAvailable: boolean;
};

export type CourseLivePreviewInput = {
  id?: string;
  title: string;
  titleStyled: IssueTitleStyled | null;
  slug: string;
  description: unknown;
  homeVariant: IssueHomeVariant;
  lessons: PublicCourseLessonSummaryDto[];
  statusLabel: string;
  publicAvailable: boolean;
};

export type LessonLivePreviewInput = {
  id?: string;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  title: string;
  titleStyled: IssueTitleStyled | null;
  slug: string;
  excerptRich: unknown;
  contentRich: unknown;
  imageUrl: string | null;
  imageAlt: string | null;
  audioUrl: string | null;
  audioChunks: unknown;
  sortOrder: number;
  statusLabel: string;
  publicAvailable: boolean;
};

const PREVIEW_UUID = "00000000-0000-4000-8000-000000000000";

export function getLivePreviewChannel(resource: LivePreviewResource, sessionId: string) {
  return `cms-preview:${resource}:${sessionId}`;
}

export function getLivePreviewStorageKey(resource: LivePreviewResource, sessionId: string) {
  return `${getLivePreviewChannel(resource, sessionId)}:snapshot`;
}

export function createLivePreviewSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
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
    homeVariant: input.homeVariant,
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

const WORDS_PER_MINUTE = 220;

function calculateReadingTimeMinutes(contentRich: unknown) {
  const text = extractPlainText(contentRich);
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

export function toCourseLivePreviewSnapshot(
  input: CourseLivePreviewInput,
): CourseLivePreviewSnapshot {
  const now = getFallbackPreviewDate();
  const title = input.title.trim() || i18n.cms.forms.resources.courses.untitledPreviewTitle;
  const slug = input.slug.trim() || "anteprima-corso";

  const course: PublicCourseDetailDto = {
    id: input.id ?? PREVIEW_UUID,
    title,
    titleStyled: input.titleStyled,
    slug,
    description: input.description ?? null,
    homeVariant: input.homeVariant,
    publishedAt: now,
    lessonsCount: input.lessons.length,
    lessons: input.lessons,
  };

  return {
    course,
    publicAvailable: input.publicAvailable,
    statusLabel: input.statusLabel,
    updatedAt: now,
  };
}

export function toLessonLivePreviewSnapshot(
  input: LessonLivePreviewInput,
): LessonLivePreviewSnapshot {
  const now = getFallbackPreviewDate();
  const title = input.title.trim() || i18n.cms.forms.resources.lessons.untitledPreviewTitle;
  const slug = input.slug.trim() || "anteprima-lezione";
  const excerpt = extractPlainText(input.excerptRich);

  const lesson: PublicLessonDetailDto = {
    id: input.id ?? PREVIEW_UUID,
    slug,
    title,
    titleStyled: input.titleStyled,
    excerpt,
    imageUrl: input.imageUrl,
    imageAlt: input.imageAlt,
    hasAudio: Boolean(input.audioUrl),
    sortOrder: input.sortOrder,
    readingTimeMinutes: calculateReadingTimeMinutes(input.contentRich),
    publishedAt: now,
    courseId: input.courseId || PREVIEW_UUID,
    courseSlug: input.courseSlug || "anteprima-corso",
    courseTitle: input.courseTitle || i18n.cms.forms.resources.lessons.previewCourseTitle,
    excerptRich: input.excerptRich,
    contentRich: input.contentRich,
    audioUrl: input.audioUrl,
    audioChunks: input.audioChunks ?? null,
    updatedAt: now,
  };

  return {
    lesson,
    publicAvailable: input.publicAvailable,
    statusLabel: input.statusLabel,
    updatedAt: now,
  };
}
