import { z } from "zod";

import type { ArticleStatus } from "@/lib/generated/prisma/enums";

export const createArticleInputSchema = z.object({
  issueId: z.string().uuid(),
  categoryId: z.string().uuid(),
  authorId: z.string().uuid(),
  title: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  excerpt: z.string().trim().optional(),
  contentRich: z.unknown(),
  imageUrl: z.string().trim().url().optional(),
  audioUrl: z.string().trim().url().optional(),
  audioChunks: z.unknown().optional(),
});

export const updateArticleInputSchema = createArticleInputSchema
  .partial()
  .extend({
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"] satisfies ArticleStatus[]).optional(),
    publishedAt: z.coerce.date().nullable().optional(),
    isFeatured: z.boolean().optional(),
    position: z.number().int().min(0).optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field is required",
  });

export const syncArticleTagsInputSchema = z.object({
  tagIds: z.array(z.string().uuid()),
});

export const reorderArticlesInputSchema = z.object({
  issueId: z.string().uuid(),
  orderedArticleIds: z
    .array(z.string().uuid())
    .min(1)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "orderedArticleIds must be unique",
    }),
});

const featuredQuerySchema = z.enum(["true", "false"]).transform((value) => value === "true");
const sortOrderSchema = z.enum(["asc", "desc"]);

export const listArticlesQuerySchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"] satisfies ArticleStatus[]).optional(),
  issueId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  authorId: z.string().uuid().optional(),
  featured: featuredQuerySchema.optional(),
  q: z.string().trim().min(1).optional(),
  sortBy: z.enum(["createdAt", "publishedAt", "position"]).default("createdAt"),
  sortOrder: sortOrderSchema.default("desc"),
});

export type CreateArticleInput = z.infer<typeof createArticleInputSchema>;
export type UpdateArticleInput = z.infer<typeof updateArticleInputSchema>;
export type SyncArticleTagsInput = z.infer<typeof syncArticleTagsInputSchema>;
export type ReorderArticlesInput = z.infer<typeof reorderArticlesInputSchema>;
export type ListArticlesQuery = z.infer<typeof listArticlesQuerySchema>;
