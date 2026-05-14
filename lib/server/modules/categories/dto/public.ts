import { z } from "zod";

export const publicCategoryDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.unknown().nullable(),
  articlesCount: z.number().int(),
});

export const publicCategoriesListDtoSchema = z.array(publicCategoryDtoSchema);

export type PublicCategoryDto = z.infer<typeof publicCategoryDtoSchema>;
