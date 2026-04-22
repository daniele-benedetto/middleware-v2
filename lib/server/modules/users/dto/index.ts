import { z } from "zod";

export const userListItemDtoSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  role: z.enum(["ADMIN", "EDITOR"]),
  createdAt: z.string(),
});

export const userDetailDtoSchema = userListItemDtoSchema;
export const userListDtoSchema = z.array(userListItemDtoSchema);

export type UserListItemDto = z.infer<typeof userListItemDtoSchema>;
export type UserDetailDto = z.infer<typeof userDetailDtoSchema>;
