import { z } from "zod";

export const createAuthorInputSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1).optional(),
  bioRich: z.unknown().optional(),
  isActive: z.boolean().default(true),
});

export const updateAuthorInputSchema = createAuthorInputSchema
  .partial()
  .extend({
    bioRich: z.unknown().nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field is required",
  });

const sortOrderSchema = z.enum(["asc", "desc"]);
const booleanQuerySchema = z.enum(["true", "false"]).transform((value) => value === "true");

export const listAuthorsQuerySchema = z.object({
  isActive: booleanQuerySchema.optional(),
  q: z.string().trim().min(1).optional(),
  sortBy: z.enum(["createdAt", "name", "slug"]).default("createdAt"),
  sortOrder: sortOrderSchema.default("desc"),
});

export type CreateAuthorInput = z.infer<typeof createAuthorInputSchema>;
export type UpdateAuthorInput = z.infer<typeof updateAuthorInputSchema>;
export type ListAuthorsQuery = z.infer<typeof listAuthorsQuerySchema>;
