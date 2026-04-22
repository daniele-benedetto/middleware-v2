import { z } from "zod";

export const createCategoryInputSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  description: z.string().trim().optional(),
});

export const updateCategoryInputSchema = createCategoryInputSchema
  .partial()
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field is required",
  });

export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategoryInputSchema>;
