import { z } from "zod";

export const tagDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.unknown().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  articlesCount: z.number().int(),
});

export const tagArticleSummaryDtoSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  isFeatured: z.boolean(),
  position: z.number().int(),
});

export const tagDetailDtoSchema = tagDtoSchema.extend({
  articles: z.array(tagArticleSummaryDtoSchema),
});

export const tagsListDtoSchema = z.array(tagDtoSchema);

export type TagDto = z.infer<typeof tagDtoSchema>;
export type TagDetailDto = z.infer<typeof tagDetailDtoSchema>;
