import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { ApiError } from "@/lib/server/http/api-error";
import { isWithinComuneOfModena } from "@/lib/server/modules/maps/boundary/modena-comune";
import { mapsRepository } from "@/lib/server/modules/maps/repository";

import type { PaginationParams } from "@/lib/server/http/pagination";
import type { MapDetailDto, MapDto, MapItemDto } from "@/lib/server/modules/maps/dto";
import type {
  CreateMapItemInput,
  CreateMapInput,
  ListMapsQuery,
  ReorderMapItemsInput,
  UpdateMapInput,
  UpdateMapItemInput,
} from "@/lib/server/modules/maps/schema";

type MapRecord = {
  id: string;
  title: string;
  titleStyled: unknown;
  descriptionRich: unknown;
  isActive: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { items: number };
};
type MapItemRecord = {
  id: string;
  mapId: string;
  title: string;
  descriptionRich: unknown;
  latitude: { toString(): string };
  longitude: { toString(): string };
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};
const toMapDto = (map: MapRecord): MapDto => ({
  id: map.id,
  title: map.title,
  titleStyled: (map.titleStyled as MapDto["titleStyled"]) ?? null,
  descriptionRich: map.descriptionRich ?? null,
  isActive: map.isActive,
  publishedAt: map.publishedAt?.toISOString() ?? null,
  createdAt: map.createdAt.toISOString(),
  updatedAt: map.updatedAt.toISOString(),
  itemsCount: map._count?.items ?? 0,
});
const toItemDto = (item: MapItemRecord): MapItemDto => ({
  id: item.id,
  mapId: item.mapId,
  title: item.title,
  descriptionRich: item.descriptionRich ?? null,
  latitude: item.latitude.toString(),
  longitude: item.longitude.toString(),
  sortOrder: item.sortOrder,
  createdAt: item.createdAt.toISOString(),
  updatedAt: item.updatedAt.toISOString(),
});
const isNotFoundError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";

async function requireMap(mapId: string) {
  const map = await mapsRepository.getById(mapId);
  if (!map) throw new ApiError(400, "VALIDATION_ERROR", "Map not found");
  return map;
}

async function requireOwnedItem(mapId: string, itemId: string) {
  const item = await mapsRepository.getItemById(itemId);
  if (!item) throw new ApiError(404, "NOT_FOUND", "Map item not found");
  if (item.mapId !== mapId)
    throw new ApiError(400, "VALIDATION_ERROR", "Map item does not belong to map");
  return item;
}

export const mapsService = {
  async list(query: ListMapsQuery, pagination: PaginationParams) {
    const [maps, total] = await Promise.all([
      mapsRepository.list(query, pagination),
      mapsRepository.count(query),
    ]);
    return { items: maps.map((map) => toMapDto(map as MapRecord)), total };
  },
  async getById(id: string) {
    const map = await mapsRepository.getById(id);
    if (!map) throw new ApiError(404, "NOT_FOUND", "Map not found");
    return {
      ...toMapDto(map as MapRecord),
      items: map.items.map((item) => toItemDto(item as MapItemRecord)),
    } satisfies MapDetailDto;
  },
  async create(input: CreateMapInput) {
    const created = await mapsRepository.create(input);
    const map = await mapsRepository.getById(created.id);
    if (!map) throw new ApiError(404, "NOT_FOUND", "Map not found");
    return toMapDto(map as MapRecord);
  },
  async update(id: string, input: UpdateMapInput) {
    try {
      await mapsRepository.update(id, input);
      const map = await mapsRepository.getById(id);
      if (!map) throw new ApiError(404, "NOT_FOUND", "Map not found");
      return toMapDto(map as MapRecord);
    } catch (error) {
      if (isNotFoundError(error)) throw new ApiError(404, "NOT_FOUND", "Map not found");
      throw error;
    }
  },
  async delete(id: string) {
    try {
      await mapsRepository.delete(id);
    } catch (error) {
      if (isNotFoundError(error)) throw new ApiError(404, "NOT_FOUND", "Map not found");
      throw error;
    }
  },
  async createItem(input: CreateMapItemInput) {
    await requireMap(input.mapId);
    if (!isWithinComuneOfModena(input.latitude, input.longitude)) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "Coordinates must be within the Province of Modena boundary",
      );
    }
    return toItemDto((await mapsRepository.createItem(input)) as MapItemRecord);
  },
  async updateItem(mapId: string, itemId: string, input: UpdateMapItemInput) {
    const current = (await requireOwnedItem(mapId, itemId)) as MapItemRecord;
    const latitude = input.latitude ?? Number(current.latitude.toString());
    const longitude = input.longitude ?? Number(current.longitude.toString());
    if (!isWithinComuneOfModena(latitude, longitude)) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "Coordinates must be within the Province of Modena boundary",
      );
    }
    try {
      return toItemDto((await mapsRepository.updateItem(itemId, input)) as MapItemRecord);
    } catch (error) {
      if (isNotFoundError(error)) throw new ApiError(404, "NOT_FOUND", "Map item not found");
      throw error;
    }
  },
  async deleteItem(mapId: string, itemId: string) {
    await requireOwnedItem(mapId, itemId);
    try {
      await mapsRepository.deleteItem(itemId);
    } catch (error) {
      if (isNotFoundError(error)) throw new ApiError(404, "NOT_FOUND", "Map item not found");
      throw error;
    }
  },
  async reorderItems(input: ReorderMapItemsInput) {
    await requireMap(input.mapId);
    const currentIds = (await mapsRepository.listItemIdsByMap(input.mapId)).map((item) => item.id);
    const expected = new Set(currentIds);
    const received = new Set(input.orderedItemIds);
    const completeSet =
      input.orderedItemIds.length === currentIds.length &&
      currentIds.every((id) => received.has(id)) &&
      input.orderedItemIds.every((id) => expected.has(id));
    if (!completeSet)
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "orderedItemIds must include all and only the map items",
      );
    return (await mapsRepository.reorderItems(input)).map((item) =>
      toItemDto(item as MapItemRecord),
    );
  },
};
