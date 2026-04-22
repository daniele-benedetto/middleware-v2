import type { ArticleStatus } from "@/lib/generated/prisma/enums";

export type CreateArticleInput = {
  issueId: string;
  categoryId: string;
  authorId: string;
  title: string;
  slug: string;
  excerpt?: string;
  contentRich: unknown;
  imageUrl?: string;
  audioUrl?: string;
  audioChunks?: unknown;
};

export type UpdateArticleInput = Partial<CreateArticleInput> & {
  status?: ArticleStatus;
  publishedAt?: Date | null;
  isFeatured?: boolean;
  position?: number;
};

export type SyncArticleTagsInput = {
  tagIds: string[];
};

export type ReorderArticlesInput = {
  issueId: string;
  orderedArticleIds: string[];
};
