import { z } from "zod";

export const createIssueInputSchema = z.object({
  title: z.string().trim().min(1),
  slug: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  coverUrl: z.string().trim().url().optional(),
  color: z.string().trim().min(1).optional(),
  isActive: z.boolean().default(true),
  publishedAt: z.coerce.date().nullable().optional(),
});

export const updateIssueInputSchema = createIssueInputSchema
  .partial()
  .extend({
    description: z.string().trim().nullable().optional(),
    coverUrl: z.string().trim().url().nullable().optional(),
    color: z.string().trim().min(1).nullable().optional(),
    publishedAt: z.coerce.date().nullable().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field is required",
  });

export const reorderIssuesInputSchema = z.object({
  orderedIssueIds: z
    .array(z.string().uuid())
    .min(1)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "orderedIssueIds must be unique",
    }),
});

const sortOrderSchema = z.enum(["asc", "desc"]);
const booleanQuerySchema = z.enum(["true", "false"]).transform((value) => value === "true");

export const listIssuesQuerySchema = z.object({
  isActive: booleanQuerySchema.optional(),
  published: booleanQuerySchema.optional(),
  q: z.string().trim().min(1).optional(),
  sortBy: z.enum(["createdAt", "sortOrder", "publishedAt"]).default("createdAt"),
  sortOrder: sortOrderSchema.default("desc"),
});

export type CreateIssueInput = z.infer<typeof createIssueInputSchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueInputSchema>;
export type ReorderIssuesInput = z.infer<typeof reorderIssuesInputSchema>;
export type ListIssuesQuery = z.infer<typeof listIssuesQuerySchema>;
