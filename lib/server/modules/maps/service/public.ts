import "server-only";

import { publicMapsRepository } from "@/lib/server/modules/maps/repository/public";

import type { IssueTitleStyled } from "@/lib/server/modules/issues/schema";
import type { PublicMapDetailDto } from "@/lib/server/modules/maps/dto/public";

export const publicMapsService = {
  async getByIds(ids: string[]): Promise<PublicMapDetailDto[]> {
    const maps = await publicMapsRepository.getByIds(ids);

    return maps.map((map) => ({
      id: map.id,
      title: map.title,
      titleStyled: (map.titleStyled as IssueTitleStyled | null) ?? null,
      descriptionRich: map.descriptionRich ?? null,
      items: map.items.map((item) => ({
        id: item.id,
        title: item.title,
        descriptionRich: item.descriptionRich ?? null,
        latitude: item.latitude.toString(),
        longitude: item.longitude.toString(),
        sortOrder: item.sortOrder,
      })),
    }));
  },
};
