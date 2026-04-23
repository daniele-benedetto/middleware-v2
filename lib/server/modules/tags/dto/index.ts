import { z } from "zod";

export const tagDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  articlesCount: z.number().int(),
});

export const tagsListDtoSchema = z.array(tagDtoSchema);

export type TagDto = z.infer<typeof tagDtoSchema>;
