import { z } from "zod";

export const publicTagDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  articlesCount: z.number().int(),
});

export const publicTagsListDtoSchema = z.array(publicTagDtoSchema);

export type PublicTagDto = z.infer<typeof publicTagDtoSchema>;
