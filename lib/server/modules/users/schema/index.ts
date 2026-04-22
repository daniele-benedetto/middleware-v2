import { z } from "zod";

export const createUserInputSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  name: z.string().trim().min(1).optional(),
  role: z.enum(["ADMIN", "EDITOR"]),
});

export const updateUserInputSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    image: z.string().trim().url().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field is required",
  });

export const updateUserRoleInputSchema = z.object({
  role: z.enum(["ADMIN", "EDITOR"]),
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;
export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleInputSchema>;
