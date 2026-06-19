import { z } from "zod";

export const publicPageDtoSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  contentRich: z.unknown(),
  publishedAt: z.string(),
  updatedAt: z.string(),
});

export const publicPagesListDtoSchema = z.array(publicPageDtoSchema);

export type PublicPageDto = z.infer<typeof publicPageDtoSchema>;
