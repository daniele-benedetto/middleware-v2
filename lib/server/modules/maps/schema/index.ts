import { z } from "zod";

import { issueTitleStyledSchema } from "@/lib/server/modules/issues/schema";
import { isWithinComuneOfModena } from "@/lib/server/modules/maps/boundary/modena-comune";

const coordinateSchema = z.coerce
  .number()
  .finite()
  .refine((value) => Math.abs(value * 1_000_000 - Math.round(value * 1_000_000)) < 1e-7, {
    message: "Coordinates must have at most 6 decimal places",
  });
const latitudeSchema = coordinateSchema.min(-90).max(90);
const longitudeSchema = coordinateSchema.min(-180).max(180);

const mapItemLocationSchema = z
  .object({ latitude: latitudeSchema, longitude: longitudeSchema })
  .refine(({ latitude, longitude }) => isWithinComuneOfModena(latitude, longitude), {
    message: "Coordinates must be within the Comune di Modena boundary",
    path: ["latitude"],
  });

export const createMapInputSchema = z.object({
  title: z.string().trim().min(1),
  titleStyled: issueTitleStyledSchema.nullable().optional(),
  descriptionRich: z.unknown().optional(),
  isActive: z.boolean().default(true),
  publishedAt: z.coerce.date().nullable().optional(),
  initialItem: z
    .object({
      title: z.string().trim().min(1),
      descriptionRich: z.unknown().optional(),
    })
    .extend(mapItemLocationSchema.shape)
    .optional(),
});

export const updateMapInputSchema = createMapInputSchema
  .partial()
  .extend({
    titleStyled: issueTitleStyledSchema.nullable().optional(),
    descriptionRich: z.unknown().nullable().optional(),
    isActive: z.boolean().optional(),
    publishedAt: z.coerce.date().nullable().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, { message: "At least one field is required" });

export const createMapItemInputSchema = z
  .object({
    mapId: z.string().uuid(),
    title: z.string().trim().min(1),
    descriptionRich: z.unknown().optional(),
  })
  .extend(mapItemLocationSchema.shape);

export const updateMapItemInputSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    descriptionRich: z.unknown().nullable().optional(),
    latitude: latitudeSchema.optional(),
    longitude: longitudeSchema.optional(),
  })
  .refine((input) => Object.keys(input).length > 0, { message: "At least one field is required" })
  .superRefine((input, context) => {
    if (
      input.latitude !== undefined &&
      input.longitude !== undefined &&
      !isWithinComuneOfModena(input.latitude, input.longitude)
    ) {
      context.addIssue({
        code: "custom",
        message: "Coordinates must be within the Comune di Modena boundary",
        path: ["latitude"],
      });
    }
  });

export const reorderMapItemsInputSchema = z.object({
  mapId: z.string().uuid(),
  orderedItemIds: z
    .array(z.string().uuid())
    .min(1)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "orderedItemIds must be unique",
    }),
});

export const listMapsQuerySchema = z.object({
  isActive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  published: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  q: z.string().trim().min(1).optional(),
  sortBy: z.enum(["createdAt", "publishedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const searchMapAddressInputSchema = z.object({
  query: z.string().trim().min(3).max(160),
});

export type CreateMapInput = z.infer<typeof createMapInputSchema>;
export type UpdateMapInput = z.infer<typeof updateMapInputSchema>;
export type CreateMapItemInput = z.infer<typeof createMapItemInputSchema>;
export type UpdateMapItemInput = z.infer<typeof updateMapItemInputSchema>;
export type ReorderMapItemsInput = z.infer<typeof reorderMapItemsInputSchema>;
export type ListMapsQuery = z.infer<typeof listMapsQuerySchema>;
export type SearchMapAddressInput = z.infer<typeof searchMapAddressInputSchema>;
