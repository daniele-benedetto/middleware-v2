import { z } from "zod";

import { issueTitleStyledSchema } from "@/lib/server/modules/issues/schema";

import type { ArticleStatus } from "@/lib/generated/prisma/enums";

const articleBaseInputSchema = z.object({
  issueId: z.string().uuid(),
  categoryId: z.string().uuid(),
  authorId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1),
  titleStyled: issueTitleStyledSchema.nullable().optional(),
  slug: z.string().trim().min(1),
  excerptRich: z.unknown().optional(),
  contentRich: z.unknown(),
  imageUrl: z.string().trim().url().optional(),
  audioUrl: z.string().trim().url().optional(),
  audioChunks: z.unknown().optional(),
});

export const createArticleInputSchema = articleBaseInputSchema.extend({
  tagIds: z.array(z.string().uuid()).optional(),
  isFeatured: z.boolean().optional(),
});

export const updateArticleInputSchema = articleBaseInputSchema
  .partial()
  .extend({
    excerptRich: z.unknown().nullable().optional(),
    imageUrl: z.string().trim().url().nullable().optional(),
    audioUrl: z.string().trim().url().nullable().optional(),
    audioChunks: z.unknown().nullable().optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"] satisfies ArticleStatus[]).optional(),
    publishedAt: z.coerce.date().nullable().optional(),
    isFeatured: z.boolean().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field is required",
  });

export const syncArticleTagsInputSchema = z.object({
  tagIds: z.array(z.string().uuid()),
});

const featuredQuerySchema = z.enum(["true", "false"]).transform((value) => value === "true");
const sortOrderSchema = z.enum(["asc", "desc"]);

export const listArticlesQuerySchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"] satisfies ArticleStatus[]).optional(),
  issueId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  authorId: z.string().uuid().nullable().optional(),
  featured: featuredQuerySchema.optional(),
  q: z.string().trim().min(1).optional(),
  sortBy: z.enum(["createdAt", "publishedAt"]).default("createdAt"),
  sortOrder: sortOrderSchema.default("desc"),
});

export type CreateArticleInput = z.infer<typeof createArticleInputSchema>;
export type ArticleTitleStyled = z.infer<typeof issueTitleStyledSchema>;
export type UpdateArticleInput = z.infer<typeof updateArticleInputSchema>;
export type SyncArticleTagsInput = z.infer<typeof syncArticleTagsInputSchema>;
export type ListArticlesQuery = z.infer<typeof listArticlesQuerySchema>;
