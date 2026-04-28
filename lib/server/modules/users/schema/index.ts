import { z } from "zod";

export const createUserInputSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  name: z.string().trim().min(1).optional(),
  role: z.enum(["ADMIN", "EDITOR"]),
});

export const updateUserInputSchema = z
  .object({
    name: z.string().trim().min(1).nullable().optional(),
    image: z.string().trim().url().nullable().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field is required",
  });

export const updateUserRoleInputSchema = z.object({
  role: z.enum(["ADMIN", "EDITOR"]),
});

const sortOrderSchema = z.enum(["asc", "desc"]);

export const listUsersQuerySchema = z.object({
  role: z.enum(["ADMIN", "EDITOR"]).optional(),
  q: z.string().trim().min(1).optional(),
  sortBy: z.enum(["createdAt", "email"]).default("createdAt"),
  sortOrder: sortOrderSchema.default("desc"),
});

export const listUserAuthorsQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;
export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleInputSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type ListUserAuthorsQuery = z.infer<typeof listUserAuthorsQuerySchema>;
