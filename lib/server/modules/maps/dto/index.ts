import { z } from "zod";

export const mapItemDtoSchema = z.object({
  id: z.string().uuid(),
  mapId: z.string().uuid(),
  title: z.string(),
  descriptionRich: z.unknown().nullable(),
  latitude: z.string(),
  longitude: z.string(),
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const mapDtoSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  descriptionRich: z.unknown().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  itemsCount: z.number().int(),
});

export const mapDetailDtoSchema = mapDtoSchema.extend({ items: z.array(mapItemDtoSchema) });
export const mapsListDtoSchema = z.array(mapDtoSchema);
export const mapItemsListDtoSchema = z.array(mapItemDtoSchema);

export type MapDto = z.infer<typeof mapDtoSchema>;
export type MapItemDto = z.infer<typeof mapItemDtoSchema>;
export type MapDetailDto = z.infer<typeof mapDetailDtoSchema>;
