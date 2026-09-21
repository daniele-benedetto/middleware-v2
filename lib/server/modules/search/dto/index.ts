import { z } from "zod";

export const publicSearchResultDtoSchema = z.object({
  id: z.string(),
  type: z.enum(["article", "course", "lesson", "page", "map", "questionnaire"]),
  title: z.string(),
  href: z.string(),
  snippet: z.string().nullable(),
  publishedAt: z.string().nullable(),
});

export const publicSearchResultsDtoSchema = z.array(publicSearchResultDtoSchema);

export const publicSearchResponseDtoSchema = z.object({
  total: z.number().int().nonnegative(),
  items: publicSearchResultsDtoSchema,
});

export const publicSearchSuggestionsDtoSchema = z.object({
  source: z.enum(["popular", "latest"]),
  items: publicSearchResultsDtoSchema,
});

export type PublicSearchResultDto = z.infer<typeof publicSearchResultDtoSchema>;
