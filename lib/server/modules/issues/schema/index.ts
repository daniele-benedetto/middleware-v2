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

export type CreateIssueInput = z.infer<typeof createIssueInputSchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueInputSchema>;
