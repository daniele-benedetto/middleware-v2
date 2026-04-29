import { z } from "zod";

export const categoryDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.unknown().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  articlesCount: z.number().int(),
});

export const categoryArticleSummaryDtoSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  isFeatured: z.boolean(),
  position: z.number().int(),
});

export const categoryDetailDtoSchema = categoryDtoSchema.extend({
  articles: z.array(categoryArticleSummaryDtoSchema),
});

export const categoriesListDtoSchema = z.array(categoryDtoSchema);

export type CategoryDto = z.infer<typeof categoryDtoSchema>;
export type CategoryDetailDto = z.infer<typeof categoryDetailDtoSchema>;
