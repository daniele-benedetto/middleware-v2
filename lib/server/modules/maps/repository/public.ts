import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const PUBLIC_MAP_SELECT = {
  id: true,
  title: true,
  titleStyled: true,
  descriptionRich: true,
  items: {
    select: {
      id: true,
      title: true,
      descriptionRich: true,
      latitude: true,
      longitude: true,
      sortOrder: true,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  },
} as const satisfies Prisma.MapSelect;

export const publicMapsRepository = {
  async getByIds(ids: string[]) {
    if (ids.length === 0) return [];

    return prisma.map.findMany({
      where: { id: { in: ids }, isActive: true, publishedAt: { not: null } },
      select: PUBLIC_MAP_SELECT,
    });
  },
};
