import { z } from "zod";

import { issueTitleStyledSchema } from "@/lib/server/modules/issues/schema";

import type { PageStatus } from "@/lib/generated/prisma/enums";

const pageStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"] satisfies PageStatus[]);
const sortOrderSchema = z.enum(["asc", "desc"]);

export const createPageInputSchema = z.object({
  title: z.string().trim().min(1),
  titleStyled: issueTitleStyledSchema.nullable().optional(),
  slug: z.string().trim().min(1),
  excerptRich: z.unknown().nullable().optional(),
  contentRich: z.unknown(),
  status: pageStatusSchema.default("DRAFT"),
  publishedAt: z.coerce.date().nullable().optional(),
});

export const updatePageInputSchema = createPageInputSchema
  .partial()
  .extend({
    status: pageStatusSchema.optional(),
    publishedAt: z.coerce.date().nullable().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field is required",
  });

export const listPagesQuerySchema = z.object({
  status: pageStatusSchema.optional(),
  q: z.string().trim().min(1).optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "publishedAt", "title"]).default("updatedAt"),
  sortOrder: sortOrderSchema.default("desc"),
});

export type CreatePageInput = z.infer<typeof createPageInputSchema>;
export type PageTitleStyled = z.infer<typeof issueTitleStyledSchema>;
export type UpdatePageInput = z.infer<typeof updatePageInputSchema>;
export type ListPagesQuery = z.infer<typeof listPagesQuerySchema>;
