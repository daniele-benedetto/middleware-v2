import { z } from "zod";

export const categoryDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  articlesCount: z.number().int(),
});

export const categoriesListDtoSchema = z.array(categoryDtoSchema);

export type CategoryDto = z.infer<typeof categoryDtoSchema>;
