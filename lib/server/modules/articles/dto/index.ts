import { z } from "zod";

const articleSummaryDtoShape = {
  id: z.string().uuid(),
  issueId: z.string().uuid(),
  categoryId: z.string().uuid(),
  authorId: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  publishedAt: z.string().nullable(),
  isFeatured: z.boolean(),
  position: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  issueTitle: z.string().nullable(),
  categoryName: z.string().nullable(),
  authorName: z.string().nullable(),
  authorEmail: z.string().nullable(),
  tagsCount: z.number().int(),
} as const;

export const articleDtoSchema = z.object(articleSummaryDtoShape);

export const articleDetailDtoSchema = z.object({
  ...articleSummaryDtoShape,
  contentRich: z.unknown(),
  audioUrl: z.string().nullable(),
  audioChunks: z.unknown().nullable(),
  excerpt: z.string().nullable(),
  imageUrl: z.string().nullable(),
  tagIds: z.array(z.string().uuid()),
});

export const articlesListDtoSchema = z.array(articleDtoSchema);

export type ArticleDto = z.infer<typeof articleDtoSchema>;
export type ArticleDetailDto = z.infer<typeof articleDetailDtoSchema>;
