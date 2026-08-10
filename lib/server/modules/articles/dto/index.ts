import { z } from "zod";

import { issueTitleStyledSchema } from "@/lib/server/modules/issues/schema";

const articleSummaryDtoShape = {
  id: z.string().uuid(),
  issueId: z.string().uuid(),
  categoryId: z.string().uuid(),
  authorId: z.string().uuid().nullable(),
  title: z.string(),
  titleStyled: issueTitleStyledSchema.nullable(),
  slug: z.string(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  issueTitle: z.string().nullable(),
  categoryName: z.string().nullable(),
  authorName: z.string().nullable(),
} as const;

export const articleDtoSchema = z.object(articleSummaryDtoShape);

export const articleDetailDtoSchema = z.object({
  ...articleSummaryDtoShape,
  excerptRich: z.unknown().nullable(),
  contentRich: z.unknown(),
  audioUrl: z.string().nullable(),
  audioChunks: z.unknown().nullable(),
  excerpt: z.string().nullable(),
  imageUrl: z.string().nullable(),
  imageAlt: z.string().nullable(),
  imageFocalX: z.number().min(0).max(100).optional(),
  imageFocalY: z.number().min(0).max(100).optional(),
  imageFilter: z.enum(["GRAYSCALE", "COLOR"]).optional(),
  imageZoom: z.number().min(1).max(3).optional(),
});

export const articlesListDtoSchema = z.array(articleDtoSchema);

export type ArticleDto = z.infer<typeof articleDtoSchema>;
export type ArticleDetailDto = z.infer<typeof articleDetailDtoSchema>;
