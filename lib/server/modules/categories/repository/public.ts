import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const PUBLIC_ARTICLE_COUNT_WHERE = {
  status: "PUBLISHED",
  publishedAt: { not: null },
  issue: { isActive: true, publishedAt: { not: null } },
} as const satisfies Prisma.ArticleWhereInput;

const PUBLIC_CATEGORY_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  _count: {
    select: {
      articles: { where: PUBLIC_ARTICLE_COUNT_WHERE },
    },
  },
} as const satisfies Prisma.CategorySelect;

export const publicCategoriesRepository = {
  async list() {
    return prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: PUBLIC_CATEGORY_SELECT,
    });
  },
  async getBySlug(slug: string) {
    return prisma.category.findFirst({
      where: { slug, isActive: true },
      select: PUBLIC_CATEGORY_SELECT,
    });
  },
};
