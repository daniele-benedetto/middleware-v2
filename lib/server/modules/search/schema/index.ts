import { z } from "zod";

export const publicSearchInputSchema = z.object({
  q: z.string().trim().min(2).max(120),
  limit: z.number().int().min(1).max(10).default(10),
});

export const publicSearchSuggestionsInputSchema = z.object({
  limit: z.number().int().min(1).max(10).default(10),
});

export type PublicSearchInput = z.infer<typeof publicSearchInputSchema>;
