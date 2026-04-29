import { z } from "zod";

export const userListItemDtoSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  role: z.enum(["ADMIN", "EDITOR"]),
  emailVerified: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  authoredArticlesCount: z.number().int(),
});

export const userArticleSummaryDtoSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  isFeatured: z.boolean(),
  position: z.number().int(),
});

export const userDetailDtoSchema = userListItemDtoSchema.extend({
  articles: z.array(userArticleSummaryDtoSchema),
});
export const userListDtoSchema = z.array(userListItemDtoSchema);

export const userAuthorOptionDtoSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
});

export const userAuthorOptionsDtoSchema = z.array(userAuthorOptionDtoSchema);

export type UserListItemDto = z.infer<typeof userListItemDtoSchema>;
export type UserDetailDto = z.infer<typeof userDetailDtoSchema>;
export type UserArticleSummaryDto = z.infer<typeof userArticleSummaryDtoSchema>;
export type UserAuthorOptionDto = z.infer<typeof userAuthorOptionDtoSchema>;
