import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const PUBLIC_PAGE_WHERE = {
  status: "PUBLISHED",
  publishedAt: { not: null },
} as const satisfies Prisma.PageWhereInput;

const PUBLIC_PAGE_SELECT = {
  id: true,
  title: true,
  titleStyled: true,
  slug: true,
  excerpt: true,
  contentRich: true,
  publishedAt: true,
  updatedAt: true,
} as const satisfies Prisma.PageSelect;

export const publicPagesRepository = {
  async getBySlug(slug: string) {
    return prisma.page.findFirst({
      where: { ...PUBLIC_PAGE_WHERE, slug },
      select: PUBLIC_PAGE_SELECT,
    });
  },
  async listPublished() {
    return prisma.page.findMany({
      where: PUBLIC_PAGE_WHERE,
      orderBy: { publishedAt: "desc" },
      select: PUBLIC_PAGE_SELECT,
    });
  },
};
