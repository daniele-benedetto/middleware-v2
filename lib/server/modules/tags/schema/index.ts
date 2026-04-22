import { z } from "zod";

export const createTagInputSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  description: z.string().trim().optional(),
});

export const updateTagInputSchema = createTagInputSchema
  .partial()
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field is required",
  });

export type CreateTagInput = z.infer<typeof createTagInputSchema>;
export type UpdateTagInput = z.infer<typeof updateTagInputSchema>;
