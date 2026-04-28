import { z } from "zod";

export const createCategoryInputSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  description: z.string().trim().optional(),
});

export const updateCategoryInputSchema = createCategoryInputSchema
  .partial()
  .extend({
    description: z.string().trim().nullable().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field is required",
  });

const sortOrderSchema = z.enum(["asc", "desc"]);
const booleanQuerySchema = z.enum(["true", "false"]).transform((value) => value === "true");

export const listCategoriesQuerySchema = z.object({
  isActive: booleanQuerySchema.optional(),
  q: z.string().trim().min(1).optional(),
  sortBy: z.enum(["createdAt", "name", "slug"]).default("createdAt"),
  sortOrder: sortOrderSchema.default("desc"),
});

export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategoryInputSchema>;
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;
