import { z } from "zod";

import {
  navigationItemSchema,
  navigationMenuKeySchema,
} from "@/lib/server/modules/navigation/schema";

export const navigationMenuDtoSchema = z.object({
  id: z.string().uuid(),
  key: navigationMenuKeySchema,
  label: z.string(),
  items: z.array(navigationItemSchema),
  updatedAt: z.string(),
});

export const navigationMenusDtoSchema = z.array(navigationMenuDtoSchema);

export const navigationOptionDtoSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  href: z.string(),
  meta: z.string().nullable(),
});

export const navigationOptionsDtoSchema = z.array(navigationOptionDtoSchema);

export const publicNavigationItemDtoSchema = z.object({
  id: z.string(),
  label: z.string(),
  href: z.string(),
  external: z.boolean(),
});

export const publicNavigationDtoSchema = z.object({
  main: z.array(publicNavigationItemDtoSchema),
  footerSections: z.array(publicNavigationItemDtoSchema),
  footerLegal: z.array(publicNavigationItemDtoSchema),
});

export type NavigationMenuDto = z.infer<typeof navigationMenuDtoSchema>;
export type NavigationOptionDto = z.infer<typeof navigationOptionDtoSchema>;
export type PublicNavigationItemDto = z.infer<typeof publicNavigationItemDtoSchema>;
export type PublicNavigationDto = z.infer<typeof publicNavigationDtoSchema>;
