import { z } from "zod";

export const authorDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  bioRich: z.unknown().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  articlesCount: z.number().int(),
});

export const authorArticleSummaryDtoSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  isFeatured: z.boolean(),
});

export const authorDetailDtoSchema = authorDtoSchema.extend({
  articles: z.array(authorArticleSummaryDtoSchema),
});

export const authorsListDtoSchema = z.array(authorDtoSchema);

export type AuthorDto = z.infer<typeof authorDtoSchema>;
export type AuthorDetailDto = z.infer<typeof authorDetailDtoSchema>;
