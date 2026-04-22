import { z } from "zod";

export const createIssueInputSchema = z.object({
  title: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  description: z.string().trim().optional(),
});

export const updateIssueInputSchema = createIssueInputSchema
  .partial()
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field is required",
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
export type ListIssuesQuery = z.infer<typeof listIssuesQuerySchema>;
