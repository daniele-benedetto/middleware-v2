import { z } from "zod";

export const publicSearchInputSchema = z.object({
  q: z.string().trim().min(2).max(120),
  limit: z.number().int().min(1).max(30).default(12),
});

export type PublicSearchInput = z.infer<typeof publicSearchInputSchema>;
