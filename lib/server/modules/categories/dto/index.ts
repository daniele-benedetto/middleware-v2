import { z } from "zod";

export const categoryDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
});

export const categoriesListDtoSchema = z.array(categoryDtoSchema);

export type CategoryDto = z.infer<typeof categoryDtoSchema>;
