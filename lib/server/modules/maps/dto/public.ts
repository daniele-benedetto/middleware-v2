import { z } from "zod";

import { issueTitleStyledSchema } from "@/lib/server/modules/issues/schema";

export const publicMapItemDtoSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  descriptionRich: z.unknown().nullable(),
  latitude: z.string(),
  longitude: z.string(),
  sortOrder: z.number().int(),
});

export const publicMapDetailDtoSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  titleStyled: issueTitleStyledSchema.nullable(),
  descriptionRich: z.unknown().nullable(),
  items: z.array(publicMapItemDtoSchema),
});

export type PublicMapDetailDto = z.infer<typeof publicMapDetailDtoSchema>;
