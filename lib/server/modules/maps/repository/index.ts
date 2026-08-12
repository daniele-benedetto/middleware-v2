import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import type { PaginationParams } from "@/lib/server/http/pagination";
import type {
  CreateMapItemInput,
  CreateMapInput,
  ListMapsQuery,
  ReorderMapItemsInput,
  UpdateMapInput,
  UpdateMapItemInput,
} from "@/lib/server/modules/maps/schema";

const MAP_SELECT = {
  id: true,
  title: true,
  titleStyled: true,
  descriptionRich: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { items: true } },
} as const satisfies Prisma.MapSelect;

const MAP_ITEM_SELECT = {
  id: true,
  mapId: true,
  title: true,
  descriptionRich: true,
  latitude: true,
  longitude: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.MapItemSelect;

const toMapWhereInput = (query: ListMapsQuery): Prisma.MapWhereInput => ({
  title: query.q ? { contains: query.q, mode: "insensitive" } : undefined,
});

export const mapsRepository = {
  async list(query: ListMapsQuery, pagination: PaginationParams) {
    return prisma.map.findMany({
      where: toMapWhereInput(query),
      orderBy: { createdAt: query.sortOrder },
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      select: MAP_SELECT,
    });
  },
  async count(query: ListMapsQuery) {
    return prisma.map.count({ where: toMapWhereInput(query) });
  },
  async getById(id: string) {
    return prisma.map.findUnique({
      where: { id },
      select: {
        ...MAP_SELECT,
        items: { select: MAP_ITEM_SELECT, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      },
    });
  },
  async create(input: CreateMapInput) {
    return prisma.map.create({
      data: {
        title: input.title,
        titleStyled:
          input.titleStyled === undefined
            ? undefined
            : (input.titleStyled as Prisma.InputJsonValue),
        descriptionRich:
          input.descriptionRich === undefined
            ? undefined
            : (input.descriptionRich as Prisma.InputJsonValue),
        items: input.initialItem
          ? {
              create: {
                title: input.initialItem.title,
                descriptionRich:
                  input.initialItem.descriptionRich === undefined
                    ? undefined
                    : (input.initialItem.descriptionRich as Prisma.InputJsonValue),
                latitude: input.initialItem.latitude.toString(),
                longitude: input.initialItem.longitude.toString(),
                sortOrder: 0,
              },
            }
          : undefined,
      },
    });
  },
  async update(id: string, input: UpdateMapInput) {
    return prisma.map.update({
      where: { id },
      data: {
        title: input.title,
        titleStyled:
          input.titleStyled === undefined
            ? undefined
            : input.titleStyled === null
              ? Prisma.JsonNull
              : (input.titleStyled as Prisma.InputJsonValue),
        descriptionRich:
          input.descriptionRich === undefined
            ? undefined
            : input.descriptionRich === null
              ? Prisma.JsonNull
              : (input.descriptionRich as Prisma.InputJsonValue),
      },
    });
  },
  async delete(id: string) {
    return prisma.map.delete({ where: { id } });
  },
  async getItemById(id: string) {
    return prisma.mapItem.findUnique({ where: { id }, select: MAP_ITEM_SELECT });
  },
  async createItem(input: CreateMapItemInput) {
    return prisma.$transaction(async (tx) => {
      const sortOrder = await tx.mapItem.count({ where: { mapId: input.mapId } });
      return tx.mapItem.create({
        data: {
          mapId: input.mapId,
          title: input.title,
          descriptionRich:
            input.descriptionRich === undefined
              ? undefined
              : (input.descriptionRich as Prisma.InputJsonValue),
          latitude: input.latitude.toString(),
          longitude: input.longitude.toString(),
          sortOrder,
        },
        select: MAP_ITEM_SELECT,
      });
    });
  },
  async updateItem(id: string, input: UpdateMapItemInput) {
    return prisma.mapItem.update({
      where: { id },
      data: {
        title: input.title,
        descriptionRich:
          input.descriptionRich === undefined
            ? undefined
            : input.descriptionRich === null
              ? Prisma.JsonNull
              : (input.descriptionRich as Prisma.InputJsonValue),
        latitude: input.latitude?.toString(),
        longitude: input.longitude?.toString(),
      },
      select: MAP_ITEM_SELECT,
    });
  },
  async deleteItem(id: string) {
    return prisma.mapItem.delete({ where: { id } });
  },
  async listItemIdsByMap(mapId: string) {
    return prisma.mapItem.findMany({
      where: { mapId },
      select: { id: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  },
  async reorderItems(input: ReorderMapItemsInput) {
    return prisma.$transaction(async (tx) => {
      for (const [sortOrder, id] of input.orderedItemIds.entries()) {
        await tx.mapItem.update({ where: { id }, data: { sortOrder } });
      }
      return tx.mapItem.findMany({
        where: { mapId: input.mapId },
        select: MAP_ITEM_SELECT,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
    });
  },
};
