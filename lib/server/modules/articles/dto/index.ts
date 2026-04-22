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
});

export const articlesListDtoSchema = z.array(articleDtoSchema);

export type ArticleDto = z.infer<typeof articleDtoSchema>;
