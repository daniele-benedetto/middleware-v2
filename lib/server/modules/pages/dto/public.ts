import { z } from "zod";

import { issueTitleStyledSchema } from "@/lib/server/modules/issues/schema";

export const publicPageDtoSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  titleStyled: issueTitleStyledSchema.nullable(),
  slug: z.string(),
  excerpt: z.string().nullable(),
  contentRich: z.unknown(),
  publishedAt: z.string(),
  updatedAt: z.string(),
});

export const publicPagesListDtoSchema = z.array(publicPageDtoSchema);

export type PublicPageDto = z.infer<typeof publicPageDtoSchema>;
