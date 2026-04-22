import { z } from "zod";

export const tagDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
});

export const tagsListDtoSchema = z.array(tagDtoSchema);

export type TagDto = z.infer<typeof tagDtoSchema>;
