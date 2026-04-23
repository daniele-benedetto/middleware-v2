import { z } from "zod";

export const articleDtoSchema = z.object({
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
});

export const articlesListDtoSchema = z.array(articleDtoSchema);

export type ArticleDto = z.infer<typeof articleDtoSchema>;
