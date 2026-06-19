import { z } from "zod";

export const publicPageSlugInputSchema = z.object({
  slug: z.string().trim().min(1),
});

export type PublicPageSlugInput = z.infer<typeof publicPageSlugInputSchema>;
