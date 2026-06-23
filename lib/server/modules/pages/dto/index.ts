import { z } from "zod";

import { issueTitleStyledSchema } from "@/lib/server/modules/issues/schema";

export const pageDtoSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  titleStyled: issueTitleStyledSchema.nullable(),
  slug: z.string(),
  excerpt: z.string().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const pageDetailDtoSchema = pageDtoSchema.extend({
  excerptRich: z.unknown().nullable(),
  contentRich: z.unknown(),
});

export const pagesListDtoSchema = z.array(pageDtoSchema);

export type PageDto = z.infer<typeof pageDtoSchema>;
export type PageDetailDto = z.infer<typeof pageDetailDtoSchema>;
