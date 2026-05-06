import { z } from "zod";

export const createTagInputSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1).optional(),
  description: z.unknown().optional(),
  isActive: z.boolean().default(true),
});

export const updateTagInputSchema = createTagInputSchema
  .partial()
  .extend({
    description: z.unknown().nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field is required",
  });

const sortOrderSchema = z.enum(["asc", "desc"]);
const booleanQuerySchema = z.enum(["true", "false"]).transform((value) => value === "true");

export const listTagsQuerySchema = z.object({
  isActive: booleanQuerySchema.optional(),
  q: z.string().trim().min(1).optional(),
  sortBy: z.enum(["createdAt", "name", "slug"]).default("createdAt"),
  sortOrder: sortOrderSchema.default("desc"),
});

export type CreateTagInput = z.infer<typeof createTagInputSchema>;
export type UpdateTagInput = z.infer<typeof updateTagInputSchema>;
export type ListTagsQuery = z.infer<typeof listTagsQuerySchema>;
