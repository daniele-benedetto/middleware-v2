import { z } from "zod";

export const pageDtoSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const pageDetailDtoSchema = pageDtoSchema.extend({
  contentRich: z.unknown(),
});

export const pagesListDtoSchema = z.array(pageDtoSchema);

export type PageDto = z.infer<typeof pageDtoSchema>;
export type PageDetailDto = z.infer<typeof pageDetailDtoSchema>;
