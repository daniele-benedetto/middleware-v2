import { z } from "zod";

export const navigationMenuKeySchema = z.enum(["main", "footer_sections", "footer_legal"]);

export const navigationItemTypeSchema = z.enum([
  "home",
  "archive",
  "page",
  "article",
  "issue",
  "custom",
]);

export const navigationResourceTypeSchema = z.enum(["page", "article", "issue"]);

const navigationBaseItemSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1).max(80),
});

export const navigationItemSchema = z.discriminatedUnion("type", [
  navigationBaseItemSchema.extend({ type: z.literal("home") }),
  navigationBaseItemSchema.extend({ type: z.literal("archive") }),
  navigationBaseItemSchema.extend({ type: z.literal("page"), resourceId: z.string().uuid() }),
  navigationBaseItemSchema.extend({ type: z.literal("article"), resourceId: z.string().uuid() }),
  navigationBaseItemSchema.extend({ type: z.literal("issue"), resourceId: z.string().uuid() }),
  navigationBaseItemSchema.extend({
    type: z.literal("custom"),
    href: z.string().trim().min(1).max(500),
  }),
]);

export const navigationItemsDocumentSchema = z.object({
  version: z.literal(1),
  items: z.array(navigationItemSchema),
});

export const updateNavigationMenuInputSchema = z.object({
  key: navigationMenuKeySchema,
  items: z.array(navigationItemSchema),
});

export const navigationOptionsInputSchema = z.object({
  type: navigationResourceTypeSchema,
  q: z.string().trim().min(1).max(80).optional(),
});

export type NavigationMenuKey = z.infer<typeof navigationMenuKeySchema>;
export type NavigationItem = z.infer<typeof navigationItemSchema>;
export type NavigationItemsDocument = z.infer<typeof navigationItemsDocumentSchema>;
export type UpdateNavigationMenuInput = z.infer<typeof updateNavigationMenuInputSchema>;
export type NavigationOptionsInput = z.infer<typeof navigationOptionsInputSchema>;
